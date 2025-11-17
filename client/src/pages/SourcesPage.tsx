import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { getQueryFn } from '@/lib/queryClient';
import type { RssSource } from '@shared/schema';
import { VENDOR_THREAT_RESEARCH, GOVERNMENT_ALERTS, MALWARE_RESEARCH, GENERAL_SECURITY_NEWS, LEGACY_SOURCES } from '@/lib/rss-sources';

export default function SourcesPage() {
  const { data: sources = [], isLoading, error } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
    queryFn: getQueryFn<RssSource[]>({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff88] mx-auto mb-4"></div>
          <p className="text-xl text-[#888]">Loading cybersecurity sources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl">Error loading sources. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Create a map of source names to their category for efficient lookup
  const sourceCategories: Record<string, string> = {};
  
  VENDOR_THREAT_RESEARCH.forEach(source => {
    sourceCategories[source.name] = 'Vendor & Private Threat Research';
  });
  
  GOVERNMENT_ALERTS.forEach(source => {
    sourceCategories[source.name] = 'Government & Agency Alerts';
  });
  
  MALWARE_RESEARCH.forEach(source => {
    sourceCategories[source.name] = 'Specialized & Malware Focus';
  });
  
  GENERAL_SECURITY_NEWS.forEach(source => {
    sourceCategories[source.name] = 'General Security News';
  });
  
  LEGACY_SOURCES.forEach(source => {
    sourceCategories[source.name] = 'Legacy Sources';
  });

  // Group sources by category for better organization
  const categorizedSources: Record<string, RssSource[]> = {};
  
  // Initialize all categories
  const allCategories = [
    'Vendor & Private Threat Research',
    'Government & Agency Alerts',
    'Specialized & Malware Focus',
    'General Security News',
    'Legacy Sources'
  ];
  
  allCategories.forEach(category => {
    categorizedSources[category] = [];
  });

  // Categorize sources from API
  sources.forEach(source => {
    const category = sourceCategories[source.name] || 'General Security News';
    if (!categorizedSources[category]) {
      categorizedSources[category] = [];
    }
    categorizedSources[category].push(source);
  });

  // Sort sources within each category by name
  Object.keys(categorizedSources).forEach(category => {
    categorizedSources[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  return (
    <>
      <Helmet>
        <title>Our Cybersecurity Sources | WhatCyber</title>
        <meta 
          name="description" 
          content="Explore the 25+ trusted cybersecurity sources that feed into WhatCyber's threat intelligence aggregator. We curate content from leading vendors, government agencies, and research teams." 
        />
        <meta 
          name="keywords" 
          content="cybersecurity sources, threat intelligence feeds, security research, cyber news sources, vulnerability feeds" 
        />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://whatcyber.com/sources" />
        <meta property="og:title" content="Our Cybersecurity Sources | WhatCyber" />
        <meta property="og:description" content="Explore the 25+ trusted cybersecurity sources that feed into WhatCyber's threat intelligence aggregator." />
        <meta property="og:image" content="https://whatcyber.com/og-image-sources.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://whatcyber.com/sources" />
        <meta property="twitter:title" content="Our Cybersecurity Sources | WhatCyber" />
        <meta property="twitter:description" content="Explore the 25+ trusted cybersecurity sources that feed into WhatCyber's threat intelligence aggregator." />
        <meta property="twitter:image" content="https://whatcyber.com/og-image-sources.png" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://whatcyber.com/sources" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-900">
        <main className="pt-24 pb-16">
          <section className="py-16 px-4 sm:px-6 relative overflow-hidden">
            <div 
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 100% 80% at 50% 20%, rgba(0, 212, 255, 0.05), transparent),
                  radial-gradient(ellipse 80% 100% at 20% 80%, rgba(0, 255, 136, 0.08), transparent)
                `
              }}
            />
            
            <div className="max-w-7xl mx-auto relative">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="text-white">Our</span>{' '}
                  <span className="bg-gradient-to-r from-[#00d4ff] to-[#00ff88] bg-clip-text text-transparent">
                    Cybersecurity Sources
                  </span>
                </h1>
                <p className="text-xl text-[#888] max-w-3xl mx-auto leading-relaxed">
                  WhatCyber aggregates threat intelligence and cybersecurity news from 25+ trusted sources across the industry. 
                  These carefully selected feeds ensure you get comprehensive coverage of the latest threats and vulnerabilities.
                </p>
              </motion.div>

              <div className="space-y-20">
                {allCategories.map((category) => {
                  const categorySources = categorizedSources[category];
                  
                  // Skip empty categories
                  if (categorySources.length === 0) return null;
                  
                  return (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8 }}
                      viewport={{ once: true }}
                      className="mb-12"
                    >
                      <h2 className="text-3xl font-bold text-white text-center mb-12">{category}</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {categorySources.map((source) => (
                          <div 
                            key={source.id}
                            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-[#00d4ff] transition-all duration-300 overflow-hidden"
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  {source.icon && (
                                    <div className="flex-shrink-0">
                                      {source.icon.startsWith('fas ') ? (
                                        <i className={`${source.icon} text-lg`} style={{ color: source.color || '#6366f1' }}></i>
                                      ) : (
                                        <span className="text-lg">{source.icon}</span>
                                      )}
                                    </div>
                                  )}
                                  <h3 className="text-lg font-bold text-white">{source.name}</h3>
                                </div>
                              </div>
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#00d4ff] hover:text-[#00ff88] text-sm break-all transition-colors duration-300"
                              >
                                {source.url}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {sources.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center py-12"
                >
                  <p className="text-[#888] text-xl">No sources available at the moment.</p>
                </motion.div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}