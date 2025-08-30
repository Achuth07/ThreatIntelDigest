import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertArticleSchema, insertBookmarkSchema, insertRssSourceSchema } from "@shared/schema";
import type { IStorage } from "./storage";
import { PostgresStorage } from "./postgres-storage";
import { MemStorage, type CVE } from "./storage";
import Parser from "rss-parser";
import axios from "axios";
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Initialize storage based on environment
const storage: IStorage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();

const parser = new Parser();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // RSS Sources
  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getRssSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  });

  app.post("/api/sources", async (req, res) => {
    try {
      const validatedData = insertRssSourceSchema.parse(req.body);
      const source = await storage.createRssSource(validatedData);
      res.status(201).json(source);
    } catch (error) {
      res.status(400).json({ message: "Invalid source data" });
    }
  });

  app.patch("/api/sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedSource = await storage.updateRssSource(id, updateData);
      
      if (updatedSource) {
        res.json(updatedSource);
      } else {
        res.status(404).json({ message: "Source not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Articles
  app.get("/api/articles", async (req, res) => {
    try {
      const { source, limit, offset, search, sortBy } = req.query;
      const articles = await storage.getArticles({
        source: source as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        search: search as string,
        sortBy: sortBy as string,
      });

      // Get bookmark status for each article
      const articlesWithBookmarks = await Promise.all(
        articles.map(async (article) => ({
          ...article,
          isBookmarked: await storage.isBookmarked(article.id),
        }))
      );

      res.json(articlesWithBookmarks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.post("/api/articles", async (req, res) => {
    try {
      const validatedData = insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(validatedData);
      res.status(201).json(article);
    } catch (error) {
      res.status(400).json({ message: "Invalid article data" });
    }
  });

  // Fetch RSS feeds
  app.post("/api/fetch-feeds", async (req, res) => {
    try {
      const sources = await storage.getRssSources();
      const activeFeeds = sources.filter(source => source.isActive);
      
      let totalFetched = 0;

      for (const source of activeFeeds) {
        try {
          const feed = await parser.parseURL(source.url);
          
          for (const item of feed.items.slice(0, 10)) { // Limit to 10 latest items per source
            if (!item.title || !item.link) continue;

            // Check if article already exists
            const existingArticles = await storage.getArticles({ search: item.title });
            const exists = existingArticles.some(article => article.title === item.title);
            
            if (!exists) {
              const threatLevel = determineThreatLevel(item.title || "", item.contentSnippet || "");
              const tags = extractTags(item.title || "", item.contentSnippet || "");
              
              await storage.createArticle({
                title: item.title,
                summary: item.contentSnippet || item.content?.substring(0, 300) + "..." || "",
                url: item.link,
                source: source.name,
                sourceIcon: source.icon || "fas fa-rss",
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                threatLevel,
                tags,
                readTime: estimateReadTime(item.contentSnippet || item.content || ""),
              });
              
              totalFetched++;
            }
          }

          // Update last fetched timestamp
          await storage.updateRssSource(source.id, {
            name: source.name,
            url: source.url,
            icon: source.icon,
            color: source.color,
            isActive: source.isActive,
          });
          
        } catch (feedError) {
          console.error(`Error fetching feed for ${source.name}:`, feedError);
        }
      }

      res.json({ message: `Successfully fetched ${totalFetched} new articles` });
    } catch (error) {
      console.error("Error fetching feeds:", error);
      res.status(500).json({ message: "Failed to fetch RSS feeds" });
    }
  });

  // Bookmarks
  app.get("/api/bookmarks", async (req, res) => {
    try {
      const { export: isExport } = req.query;
      
      if (isExport === 'true') {
        // Export bookmarks with full article details
        const bookmarksWithArticles = await storage.getBookmarksWithArticles();
        
        // Format for export
        const exportData = {
          exportedAt: new Date().toISOString(),
          totalBookmarks: bookmarksWithArticles.length,
          bookmarks: bookmarksWithArticles.map(item => ({
            title: item.article.title,
            summary: item.article.summary,
            url: item.article.url,
            source: item.article.source,
            publishedAt: item.article.publishedAt,
            threatLevel: item.article.threatLevel,
            tags: item.article.tags,
            bookmarkedAt: item.bookmark.createdAt
          }))
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="cyberfeed-bookmarks-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
      } else {
        // Regular bookmarks fetch
        const bookmarks = await storage.getBookmarks();
        res.json(bookmarks);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const validatedData = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark(validatedData);
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(400).json({ message: "Invalid bookmark data" });
    }
  });

  app.delete("/api/bookmarks/:articleId", async (req, res) => {
    try {
      const { articleId } = req.params;
      const deleted = await storage.deleteBookmark(articleId);
      
      if (deleted) {
        res.json({ message: "Bookmark removed successfully" });
      } else {
        res.status(404).json({ message: "Bookmark not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  });

  // Database initialization endpoint
  app.post("/api/init-db", async (req, res) => {
    try {
      // Import the database handler
      const { default: databaseHandler } = await import('../api/database');
      // Create a mock Vercel request/response for compatibility
      const vercelReq = { ...req, method: 'POST', query: { action: 'init' } } as any;
      const vercelRes = { 
        status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }),
        json: (data: any) => res.json(data)
      } as any;
      
      await databaseHandler(vercelReq, vercelRes);
    } catch (error) {
      console.error('Error in init-db endpoint:', error);
      res.status(500).json({ message: 'Failed to initialize database' });
    }
  });

  // Database check endpoint
  app.get("/api/check-db", async (req, res) => {
    try {
      const { default: databaseHandler } = await import('../api/database');
      const vercelReq = { ...req, method: 'GET', query: { action: 'check' } } as any;
      const vercelRes = { 
        status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }),
        json: (data: any) => res.json(data)
      } as any;
      
      await databaseHandler(vercelReq, vercelRes);
    } catch (error) {
      console.error('Error in check-db endpoint:', error);
      res.status(500).json({ message: 'Failed to check database' });
    }
  });

  // Ping endpoint
  app.get("/api/ping", async (req, res) => {
    try {
      const { default: databaseHandler } = await import('../api/database');
      const vercelReq = { ...req, method: 'GET', query: { action: 'ping' } } as any;
      const vercelRes = { 
        status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }),
        json: (data: any) => res.json(data)
      } as any;
      
      await databaseHandler(vercelReq, vercelRes);
    } catch (error) {
      console.error('Error in ping endpoint:', error);
      res.status(500).json({ message: 'Failed to ping API' });
    }
  });

  // Initialize sources endpoint
  app.post("/api/initialize-sources", async (req, res) => {
    try {
      const { default: databaseHandler } = await import('../api/database');
      const vercelReq = { ...req, method: 'POST', query: { action: 'initialize-sources' } } as any;
      const vercelRes = { 
        status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }),
        json: (data: any) => res.json(data)
      } as any;
      
      await databaseHandler(vercelReq, vercelRes);
    } catch (error) {
      console.error('Error in initialize-sources endpoint:', error);
      res.status(500).json({ message: 'Failed to initialize sources' });
    }
  });

  // CVE/Vulnerabilities endpoints
  app.post("/api/fetch-cves", async (req, res) => {
    try {
      // Check if using memory storage
      if (!process.env.DATABASE_URL) {
        // Use in-memory storage implementation
        await fetchCVEsToMemory(storage, res);
      } else {
        // Import the fetch-cves handler for PostgreSQL
        const { default: fetchCVEsHandler } = await import('../api/fetch-cves');
        // Create a mock Vercel request/response for compatibility
        const vercelReq = { ...req, method: 'POST' } as any;
        const vercelRes = { 
          status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }),
          json: (data: any) => res.json(data)
        } as any;
        
        await fetchCVEsHandler(vercelReq, vercelRes);
      }
    } catch (error) {
      console.error('Error in fetch-cves endpoint:', error);
      res.status(500).json({ message: 'Failed to fetch CVEs' });
    }
  });

  app.get("/api/vulnerabilities", async (req, res) => {
    try {
      // Check if using memory storage
      if (!process.env.DATABASE_URL) {
        // Use in-memory storage implementation
        await getVulnerabilitiesFromMemory(storage, req, res);
      } else {
        // Import the vulnerabilities handler for PostgreSQL
        const { default: vulnerabilitiesHandler } = await import('../api/vulnerabilities');
        // Create a mock Vercel request/response for compatibility
        const vercelReq = { ...req, method: 'GET', query: req.query } as any;
        const vercelRes = { 
          status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }),
          json: (data: any) => res.json(data)
        } as any;
        
        await vulnerabilitiesHandler(vercelReq, vercelRes);
      }
    } catch (error) {
      console.error('Error in vulnerabilities endpoint:', error);
      res.status(500).json({ message: 'Failed to fetch vulnerabilities' });
    }
  });

  const httpServer = createServer(app);

  // Fetch Article Content
  app.get("/api/fetch-article", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'URL parameter is required' });
    }

    try {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: 'Invalid URL format' });
      }

      // Fetch the article HTML with a realistic User-Agent
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000, // 15 second timeout
        maxRedirects: 5,
      });

      if (!response.data) {
        return res.status(404).json({ message: 'No content found at the provided URL' });
      }

      // Parse HTML with JSDOM
      const dom = new JSDOM(response.data, {
        url: url,
      });

      // Use Readability to extract the main content
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        return res.status(422).json({ 
          message: 'Unable to extract readable content from this article. The page may not contain article content or may be behind a paywall.' 
        });
      }

      // Clean up the DOM
      dom.window.close();

      // Return the parsed article content
      res.json({
        title: article.title,
        content: article.content,
        textContent: article.textContent,
        length: article.length,
        excerpt: article.excerpt,
        byline: article.byline,
        dir: article.dir,
        siteName: article.siteName,
        lang: article.lang,
      });

    } catch (error) {
      console.error('Error fetching article:', error);

      // Handle specific error types
      if (axios.isAxiosError(error)) {
        if (error.code === 'ENOTFOUND') {
          return res.status(404).json({ message: 'Article URL not found' });
        }
        if (error.code === 'ECONNABORTED') {
          return res.status(408).json({ message: 'Request timeout - the article took too long to load' });
        }
        if (error.response?.status === 403) {
          return res.status(403).json({ message: 'Access denied - the website may be blocking automated requests' });
        }
        if (error.response?.status === 404) {
          return res.status(404).json({ message: 'Article not found at the provided URL' });
        }
        if (error.response?.status === 429) {
          return res.status(429).json({ message: 'Rate limited - too many requests to this website' });
        }
        if (error.response?.status && error.response.status >= 500) {
          return res.status(502).json({ message: 'The article website is currently unavailable' });
        }
      }

      // Generic error response
      res.status(500).json({ 
        message: 'Failed to fetch article content. Please check the URL and try again.' 
      });
    }
  });

  return httpServer;
}

// Helper functions for in-memory CVE support
async function fetchCVEsToMemory(storage: any, res: any) {
  console.log('Fetching CVEs to in-memory storage...');
  
  if (!process.env.NVD_API_KEY) {
    return res.status(500).json({ 
      error: 'NVD_API_KEY environment variable is required'
    });
  }
  
  try {
    // Calculate date range for recent CVEs (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Fetch CVEs from NVD API
    const nvdResponse = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0/?lastModStartDate=${startDateStr}T00:00:00.000&lastModEndDate=${endDateStr}T23:59:59.999&resultsPerPage=50`,
      {
        headers: {
          'apiKey': process.env.NVD_API_KEY,
          'User-Agent': 'ThreatIntelDigest/1.0',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!nvdResponse.ok) {
      throw new Error(`NVD API error: ${nvdResponse.status} ${nvdResponse.statusText}`);
    }
    
    const nvdData = await nvdResponse.json();
    console.log(`Found ${nvdData.vulnerabilities?.length || 0} CVEs from NVD`);
    
    let processedCount = 0;
    let errors: string[] = [];
    
    if (nvdData.vulnerabilities && nvdData.vulnerabilities.length > 0) {
      for (const vuln of nvdData.vulnerabilities) {
        try {
          const cve = vuln.cve;
          const cveId = cve.id;
          
          // Check if CVE already exists
          const exists = await storage.cveExists(cveId);
          
          if (!exists) {
            // Extract description
            const description = cve.descriptions?.find((desc: any) => desc.lang === 'en')?.value || 'No description available';
            
            // Extract CVSS scores
            let cvssV3Score = null;
            let cvssV3Severity = null;
            let cvssV2Score = null;
            let cvssV2Severity = null;
            
            const metrics = cve.metrics;
            if (metrics?.cvssMetricV31?.[0]) {
              cvssV3Score = metrics.cvssMetricV31[0].cvssData.baseScore;
              cvssV3Severity = metrics.cvssMetricV31[0].cvssData.baseSeverity;
            } else if (metrics?.cvssMetricV30?.[0]) {
              cvssV3Score = metrics.cvssMetricV30[0].cvssData.baseScore;
              cvssV3Severity = metrics.cvssMetricV30[0].cvssData.baseSeverity;
            }
            
            if (metrics?.cvssMetricV2?.[0]) {
              cvssV2Score = metrics.cvssMetricV2[0].cvssData.baseScore;
              cvssV2Severity = metrics.cvssMetricV2[0].baseSeverity;
            }
            
            // Extract weaknesses (CWEs)
            const weaknesses = cve.weaknesses?.map((weakness: any) => 
              weakness.description?.find((desc: any) => desc.lang === 'en')?.value
            ).filter(Boolean) || [];
            
            // Extract references
            const references = cve.references?.map((ref: any) => ({
              url: ref.url,
              source: ref.source || 'Unknown',
              tags: ref.tags || []
            })) || [];
            
            await storage.createCVE({
              id: cveId,
              description,
              publishedDate: new Date(cve.published),
              lastModifiedDate: new Date(cve.lastModified),
              vulnStatus: cve.vulnStatus,
              cvssV3Score,
              cvssV3Severity,
              cvssV2Score,
              cvssV2Severity,
              weaknesses,
              references
            });
            
            processedCount++;
            console.log(`Saved CVE: ${cveId}`);
          } else {
            console.log(`CVE already exists: ${cveId}`);
          }
        } catch (cveError) {
          console.error(`Failed to process CVE:`, cveError);
          errors.push(`Failed to process CVE: ${cveError instanceof Error ? cveError.message : 'Unknown error'}`);
        }
      }
    }
    
    console.log(`CVE fetch complete. Processed ${processedCount} new CVEs.`);
    res.json({ 
      message: `Successfully fetched ${processedCount} new CVEs`,
      totalProcessed: processedCount,
      totalFromAPI: nvdData.vulnerabilities?.length || 0,
      errors: errors.length > 0 ? errors.slice(0, 5) : [],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error fetching CVEs:", error);
    res.status(500).json({ 
      message: "Failed to fetch CVEs from NVD",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getVulnerabilitiesFromMemory(storage: any, req: any, res: any) {
  try {
    const { 
      limit = '50', 
      severity, 
      page = '1' 
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;
    
    const cves = await storage.getCVEs({
      limit: limitNum,
      offset,
      severity: severity as string
    });
    
    // Get total count for pagination (simplified for memory storage)
    const allCVEs = await storage.getCVEs({});
    const totalCount = allCVEs.length;
    
    // Transform CVEs to match the API response format
    const vulnerabilities = cves.map((cve: any) => ({
      id: cve.id,
      description: cve.description,
      publishedDate: cve.publishedDate.toISOString(),
      lastModifiedDate: cve.lastModifiedDate.toISOString(),
      vulnStatus: cve.vulnStatus,
      cvssV3Score: cve.cvssV3Score,
      cvssV3Severity: cve.cvssV3Severity,
      cvssV2Score: cve.cvssV2Score,
      cvssV2Severity: cve.cvssV2Severity,
      weaknesses: cve.weaknesses || [],
      references: cve.references || [],
      createdAt: cve.createdAt.toISOString(),
    }));
    
    res.json({
      vulnerabilities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1,
      },
      meta: {
        count: vulnerabilities.length,
        lastUpdated: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error("Error fetching vulnerabilities from memory:", error);
    res.status(500).json({ 
      message: "Failed to fetch vulnerabilities",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions
function determineThreatLevel(title: string, content: string): string {
  const text = (title + " " + content).toLowerCase();
  
  if (text.includes("critical") || text.includes("zero-day") || text.includes("ransomware")) {
    return "CRITICAL";
  } else if (text.includes("high") || text.includes("vulnerability") || text.includes("exploit")) {
    return "HIGH";
  } else {
    return "MEDIUM";
  }
}

function extractTags(title: string, content: string): string[] {
  const text = (title + " " + content).toLowerCase();
  const tags: string[] = [];
  
  const commonTags = [
    "malware", "ransomware", "phishing", "zero-day", "vulnerability", 
    "exploit", "apt", "microsoft", "google", "apple", "android", "ios",
    "windows", "linux", "cloud", "aws", "azure", "kubernetes", "docker"
  ];
  
  commonTags.forEach(tag => {
    if (text.includes(tag)) {
      tags.push(tag.charAt(0).toUpperCase() + tag.slice(1));
    }
  });
  
  return tags.slice(0, 3); // Limit to 3 tags
}

function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
