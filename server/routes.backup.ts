import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertArticleSchema, insertBookmarkSchema, insertRssSourceSchema } from "../shared/schema";
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
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Log when API routes are being registered
  console.log('Registering API routes...');
  
  // Import the consolidated API handler
  const { default: consolidatedApiHandler } = await import('../api/index');
  
  // Create a helper function to create mock VercelRequest and VercelResponse objects
  const createMockHandlers = (req: any, res: any, url: string) => {
    const mockReq = {
      method: req.method,
      url: url,
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      },
      setHeader: (name: string, value: string) => {
        res.setHeader(name, value);
        return mockRes;
      },
      end: () => {
        res.end();
        return mockRes;
      }
    };
    
    return { mockReq, mockRes };
  };
  
  // Sources API
  app.get('/api/sources', async (req, res) => {
    const { mockReq, mockRes } = createMockHandlers(req, res, '/api/sources');
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });
  
  app.post('/api/sources', async (req, res) => {
    const { mockReq, mockRes } = createMockHandlers(req, res, '/api/sources');
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });
  
  app.patch('/api/sources/:id', async (req, res) => {
    const { mockReq, mockRes } = createMockHandlers(req, res, `/api/sources/${req.params.id}`);
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });
  
  app.delete('/api/sources/:id', async (req, res) => {
    const { mockReq, mockRes } = createMockHandlers(req, res, `/api/sources/${req.params.id}`);
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });
  
  // Articles API
  app.get('/api/articles', async (req, res) => {
    const { default: articlesHandler } = await import('../api/articles');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'GET',
      url: '/api/articles',
      headers: req.headers,
      query: req.query,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await articlesHandler(mockReq as any, mockRes as any);
  });
  
  // Bookmarks API
  app.get('/api/bookmarks', async (req, res) => {
    const { default: bookmarksHandler } = await import('../api/bookmarks');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'GET',
      url: '/api/bookmarks',
      headers: req.headers,
      query: req.query,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await bookmarksHandler(mockReq as any, mockRes as any);
  });
  
  app.post('/api/bookmarks', async (req, res) => {
    const { default: bookmarksHandler } = await import('../api/bookmarks');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'POST',
      url: '/api/bookmarks',
      headers: req.headers,
      body: req.body,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await bookmarksHandler(mockReq as any, mockRes as any);
  });
  
  // User Source Preferences API
  app.get('/api/user-source-preferences', async (req, res) => {
    const { default: userSourcePreferencesHandler } = await import('../api/user-source-preferences');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'GET',
      url: '/api/user-source-preferences',
      headers: req.headers,
      query: req.query,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await userSourcePreferencesHandler(mockReq as any, mockRes as any);
  });
  
  app.post('/api/user-source-preferences', async (req, res) => {
    const { default: userSourcePreferencesHandler } = await import('../api/user-source-preferences');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'POST',
      url: '/api/user-source-preferences',
      headers: req.headers,
      body: req.body,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await userSourcePreferencesHandler(mockReq as any, mockRes as any);
  });
  
  app.delete('/api/user-source-preferences/:sourceId', async (req, res) => {
    const { default: userSourcePreferencesHandler } = await import('../api/user-source-preferences');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'DELETE',
      url: `/api/user-source-preferences/${req.params.sourceId}`,
      headers: req.headers,
      query: req.query,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await userSourcePreferencesHandler(mockReq as any, mockRes as any);
  });
  
  app.delete('/api/bookmarks/:articleId', async (req, res) => {
    const { default: bookmarksHandler } = await import('../api/bookmarks');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'DELETE',
      url: `/api/bookmarks/${req.params.articleId}`,
      headers: req.headers,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await bookmarksHandler(mockReq as any, mockRes as any);
  });
  
  // Fetch feeds API
  app.post('/api/fetch-feeds', async (req, res) => {
    const { default: fetchFeedsHandler } = await import('../api/fetch-feeds');
    // Create mock VercelRequest and VercelResponse objects
    const mockReq = {
      method: 'POST',
      url: '/api/fetch-feeds',
      headers: req.headers,
      body: req.body,
    };
    
    const mockRes = {
      status: (code: number) => {
        res.status(code);
        return mockRes;
      },
      json: (data: any) => {
        res.json(data);
        return mockRes;
      },
      send: (data: any) => {
        res.send(data);
        return mockRes;
      }
    };
    
    await fetchFeedsHandler(mockReq as any, mockRes as any);
  });
  
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

      // Import required modules dynamically
      const { default: axios } = await import('axios');
      const { JSDOM } = await import('jsdom');
      const { Readability } = await import('@mozilla/readability');

      // Fetch the article HTML with more realistic browser headers
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/',
        },
        timeout: 15000, // 15 second timeout
        maxRedirects: 5,
        // Add response type to handle different content encodings
        responseType: 'text',
        decompress: true,
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
      
      // Import axios dynamically to check for axios errors
      const { default: axios } = await import('axios');
      
      // Handle specific error types
      if (axios.isAxiosError(error)) {
        if (error.code === 'ENOTFOUND') {
          return res.status(404).json({ message: 'Article URL not found' });
        }
        if (error.code === 'ECONNABORTED') {
          return res.status(408).json({ message: 'Request timeout - the article took too long to load' });
        }
        if (error.response?.status === 403) {
          return res.status(403).json({ 
            message: 'Access denied - the website may be blocking automated requests. Try reading the article directly on the source website.',
            url: url
          });
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

  // CounterAPI Proxy Endpoint
  app.get("/api/counter", async (req, res) => {
    console.log('GET /api/counter called');
    try {
      // Proxy request to CounterAPI
      const counterResponse = await fetch('https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed');
      
      if (counterResponse.ok) {
        const data = await counterResponse.json();
        res.json(data);
      } else {
        // If CounterAPI returns an error, try to get error details
        const errorText = await counterResponse.text();
        res.status(counterResponse.status).json({ 
          error: `CounterAPI error: ${counterResponse.status}`,
          details: errorText
        });
      }
    } catch (error) {
      console.error('CounterAPI proxy error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch counter data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/counter/increment", async (req, res) => {
    console.log('POST /api/counter/increment called');
    try {
      // Try different approaches to increment the counter
      // Approach 1: POST to the counter endpoint with up action
      const counterResponse = await fetch('https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (counterResponse.ok) {
        const data = await counterResponse.json();
        res.json(data);
      } else {
        // If that fails, try a different approach
        const errorText = await counterResponse.text();
        console.log('First approach failed:', errorText);
        
        // Approach 2: GET request to the up endpoint
        const counterResponse2 = await fetch('https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up', {
          method: 'GET',
        });
        
        if (counterResponse2.ok) {
          const data = await counterResponse2.json();
          res.json(data);
        } else {
          const errorText2 = await counterResponse2.text();
          console.log('Second approach failed:', errorText2);
          
          // If both approaches fail, return error
          res.status(counterResponse.status).json({ 
            error: `CounterAPI error: ${counterResponse.status}`,
            details: errorText
          });
        }
      }
    } catch (error) {
      console.error('CounterAPI proxy increment error:', error);
      res.status(500).json({ 
        error: 'Failed to increment counter',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/visitor-count/increment', async (req, res) => {
    try {
      console.log('POST /api/visitor-count/increment - Starting request');
      
      // Use CounterAPI v2 with token if available
      const apiToken = process.env.VITE_THREATFEED_COUNTER;
      
      if (apiToken) {
        // Use CounterAPI v2 with authentication
        const counterUrl = `https://api.counterapi.dev/v2/threatfeed/visitorstothreatfeed/up`;
        
        const response = await fetch(counterUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`CounterAPI v2 failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('POST /api/visitor-count/increment - Success', data);
        res.json(data);
      } else {
        // Fallback to CounterAPI v1
        const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up/`;
        
        const response = await fetch(counterUrl, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error(`CounterAPI v1 failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('POST /api/visitor-count/increment - Success', data);
        res.json(data);
      }
    } catch (error) {
      console.error('POST /api/visitor-count/increment - Error:', error);
      res.status(500).json({ error: 'Failed to increment visitor count' });
    }
  });

  app.get('/api/visitor-count', async (req, res) => {
    try {
      console.log('GET /api/visitor-count - Starting request');
      
      // Use CounterAPI v2 with token if available
      const apiToken = process.env.VITE_THREATFEED_COUNTER;
      
      if (apiToken) {
        // Use CounterAPI v2 with authentication
        const counterUrl = `https://api.counterapi.dev/v2/threatfeed/visitorstothreatfeed`;
        
        const response = await fetch(counterUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`CounterAPI v2 failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('GET /api/visitor-count - Success', data);
        res.json(data);
      } else {
        // Fallback to CounterAPI v1
        const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/`;
        
        const response = await fetch(counterUrl, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error(`CounterAPI v1 failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('GET /api/visitor-count - Success', data);
        res.json(data);
      }
    } catch (error) {
      console.error('GET /api/visitor-count - Error:', error);
      res.status(500).json({ error: 'Failed to fetch visitor count' });
    }
  });

  console.log('API routes registered successfully');
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
              cvssV3Severity = metrics.cvssMetricV30[0].baseSeverity;
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
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        hasNext: pageNum < Math.ceil(totalCount / limitNum),
        hasPrev: pageNum > 1,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error("Error getting vulnerabilities:", error);
    res.status(500).json({ 
      message: "Failed to get vulnerabilities",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}