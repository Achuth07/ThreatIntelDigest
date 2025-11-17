import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { getQueryFn } from '@/lib/queryClient';
import type { RssSource } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SourcesPage() {
  const { data: sources = [], isLoading, error } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
    queryFn: getQueryFn<RssSource[]>({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatcyber-teal mx-auto mb-4"></div>
          <p>Loading cybersecurity sources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Error loading sources. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Group sources by category for better organization
  const vendorSources = sources.filter(source => 
    ['Google Mandiant Threat Intelligence', 'Cisco Talos Intelligence', 'CrowdStrike Blog', 
     'Red Canary Blog', 'Securelist (Kaspersky)', 'ESET WeLiveSecurity', 'Trustwave SpiderLabs',
     'Palo Alto Unit 42', 'Microsoft Security Blog', 'FortiGuard Labs', 'Cisco Threat Research Blog',
     'Check Point Research'].includes(source.name)
  );

  const governmentSources = sources.filter(source => 
    ['CISA Alerts (US)', 'NCSC Threat Reports (UK)', 'SANS Internet Storm Center'].includes(source.name)
  );

  const malwareSources = sources.filter(source => 
    ['MalwareTech', 'The DFIR Report', 'vx-underground', 'Malware.News Analysis'].includes(source.name)
  );

  const generalSources = sources.filter(source => 
    !vendorSources.includes(source) && 
    !governmentSources.includes(source) && 
    !malwareSources.includes(source)
  );

  const renderSourceGrid = (title: string, sourceList: RssSource[]) => (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold mb-6 text-whatcyber-teal border-b border-whatcyber-gray pb-2">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sourceList.map((source) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-whatcyber-dark border-whatcyber-gray hover:border-whatcyber-teal transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  {source.icon && (
                    <span className="mr-2">
                      {source.icon.startsWith('fas ') ? (
                        <i className={source.icon}></i>
                      ) : (
                        source.icon
                      )}
                    </span>
                  )}
                  <span className="text-slate-100">{source.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-whatcyber-teal hover:text-whatcyber-green break-all"
                >
                  {source.url}
                </a>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-whatcyber-darker text-slate-100">
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
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Our <span className="text-whatcyber-teal">Cybersecurity</span> Sources
          </h1>
          
          <p className="text-lg text-slate-300 mb-12 text-center max-w-3xl mx-auto">
            WhatCyber aggregates threat intelligence and cybersecurity news from 25+ trusted sources across the industry. 
            These carefully selected feeds ensure you get comprehensive coverage of the latest threats and vulnerabilities.
          </p>
          
          {vendorSources.length > 0 && renderSourceGrid('Vendor & Threat Research', vendorSources)}
          {governmentSources.length > 0 && renderSourceGrid('Government & Agency Alerts', governmentSources)}
          {malwareSources.length > 0 && renderSourceGrid('Malware & Specialized Research', malwareSources)}
          {generalSources.length > 0 && renderSourceGrid('General Security News', generalSources)}
          
          {sources.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No sources available at the moment.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}