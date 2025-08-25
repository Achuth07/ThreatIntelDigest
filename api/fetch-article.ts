import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
      if (error.response?.status >= 500) {
        return res.status(502).json({ message: 'The article website is currently unavailable' });
      }
    }

    // Generic error response
    res.status(500).json({ 
      message: 'Failed to fetch article content. Please check the URL and try again.' 
    });
  }
}