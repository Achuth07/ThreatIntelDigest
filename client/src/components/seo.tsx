import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'WhatCyber - ThreatFeed',
  description = 'Advanced cybersecurity solutions powered by AI. Protecting your digital assets with next-generation threat intelligence and automated defense systems.',
  image = 'https://www.whatcyber.com/og-image.jpg',
  url,
  type = 'website',
  keywords
}) => {
  // Get the current location for canonical URL
  const location = typeof window !== 'undefined' ? window.location.pathname : '';
  const canonicalUrl = url || `https://www.whatcyber.com${location === '/' ? '/' : location.endsWith('/') ? location : location + '/'}`;

  useEffect(() => {
    // Update title
    document.title = title;
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDescription) {
      metaDescription = document.createElement('meta') as HTMLMetaElement;
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;
    
    // Update or create meta keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta') as HTMLMetaElement;
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = keywords;
    }
    
    // Update or create meta author
    let metaAuthor = document.querySelector('meta[name="author"]') as HTMLMetaElement | null;
    if (!metaAuthor) {
      metaAuthor = document.createElement('meta') as HTMLMetaElement;
      metaAuthor.name = 'author';
      document.head.appendChild(metaAuthor);
    }
    metaAuthor.content = 'WhatCyber';
    
    // Update or create robots meta tag
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!metaRobots) {
      metaRobots = document.createElement('meta') as HTMLMetaElement;
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'index, follow';
    
    // Update or create Open Graph tags
    updateMetaTag('og:type', type);
    updateMetaTag('og:url', canonicalUrl);
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    
    // Update or create Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:url', canonicalUrl);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    
    // Update canonical tag
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link') as HTMLLinkElement;
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;
    
    return () => {
      // Cleanup function - but we don't remove the tags as they might be needed by other components
    };
  }, [title, description, image, canonicalUrl, type, keywords]);
  
  const updateMetaTag = (property: string, content: string) => {
    let metaTag = document.querySelector(`meta[property="${property}"]`) || 
                  document.querySelector(`meta[name="${property}"]`);
    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (property.startsWith('og:') || property.startsWith('twitter:')) {
        metaTag.setAttribute('property', property);
      } else {
        (metaTag as HTMLMetaElement).name = property;
      }
      document.head.appendChild(metaTag);
    }
    (metaTag as HTMLMetaElement).content = content;
  };
  
  return null;
};