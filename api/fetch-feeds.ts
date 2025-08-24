import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';
import Parser from 'rss-parser';

const storage = new PostgresStorage();
const parser = new Parser();

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
}