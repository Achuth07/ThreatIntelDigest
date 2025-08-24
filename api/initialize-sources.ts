import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';

const storage = new PostgresStorage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Force initialization of default sources
    const existingSources = await storage.getRssSources();
    
    if (existingSources.length === 0) {
      const defaultSources = [
        {
          name: "Bleeping Computer",
          url: "https://www.bleepingcomputer.com/feed/",
          icon: "fas fa-exclamation",
          color: "#ef4444",
          isActive: true,
        },
        {
          name: "The Hacker News",
          url: "https://feeds.feedburner.com/TheHackersNews",
          icon: "fas fa-user-secret",
          color: "#f97316",
          isActive: true,
        },
        {
          name: "Dark Reading",
          url: "https://www.darkreading.com/rss_simple.asp",
          icon: "fas fa-eye",
          color: "#8b5cf6",
          isActive: true,
        },
        {
          name: "CrowdStrike Blog",
          url: "https://www.crowdstrike.com/blog/feed/",
          icon: "fas fa-crow",
          color: "#dc2626",
          isActive: true,
        },
        {
          name: "Unit 42",
          url: "https://unit42.paloaltonetworks.com/feed/",
          icon: "fas fa-shield-virus",
          color: "#2563eb",
          isActive: true,
        },
        {
          name: "The DFIR Report",
          url: "https://thedfirreport.com/feed/",
          icon: "fas fa-search",
          color: "#16a34a",
          isActive: true,
        },
      ];

      for (const source of defaultSources) {
        await storage.createRssSource(source);
      }
      
      res.json({ 
        message: `Initialized ${defaultSources.length} default RSS sources`,
        sources: defaultSources.length
      });
    } else {
      res.json({ 
        message: `${existingSources.length} sources already exist`,
        sources: existingSources.length
      });
    }
  } catch (error) {
    console.error("Error initializing sources:", error);
    res.status(500).json({ message: "Failed to initialize RSS sources" });
  }
}