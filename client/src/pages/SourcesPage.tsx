import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { getQueryFn } from '@/lib/queryClient';
import type { RssSource } from '@shared/schema';
import { VENDOR_THREAT_RESEARCH, GOVERNMENT_ALERTS, MALWARE_RESEARCH, GENERAL_SECURITY_NEWS, LEGACY_SOURCES } from '@/lib/rss-sources';
import { Link } from 'wouter';
import { Menu, X } from 'lucide-react';

export default function SourcesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { data: sources = [], isLoading, error } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
    queryFn: getQueryFn<RssSource[]>({ on401: "throw" }),
  });

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Threat Feed', href: '/threatfeed' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];

  const handleGetStarted = () => {
    window.open('https://www.whatcyber.com/threatfeed/', '_blank');
  };

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
      
      <div className="min-h-screen relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 120% 100% at 30% 50%, rgba(0, 212, 255, 0.08), transparent),
            radial-gradient(ellipse 80% 120% at 70% 20%, rgba(0, 255, 136, 0.06), transparent),
            linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)
          `
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="fixed inset-x-0 mx-auto w-fit z-50 top-6"
        >
          <nav className="relative backdrop-blur-md bg-black/20 border border-white/10 rounded-full px-6 py-3 shadow-2xl">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[rgba(0,212,255,0.1)] via-transparent to-[rgba(0,255,136,0.1)] opacity-50" />
            
            <div className="flex items-center justify-between gap-8 relative z-10">
              {/* Logo */}
              <motion.div 
                className="flex items-center gap-2 cursor-pointer group"
                whileHover={{ scale: 1.05 }}
                onClick={() => window.location.href = '/'}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden group-hover:shadow-lg group-hover:shadow-[#00d4ff]/25 transition-all duration-300">
                  <img 
                    src="/android-chrome-192x192.png" 
                    alt="WhatCyber Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-white font-bold text-lg group-hover:text-[#00d4ff] transition-colors duration-300">
                  WhatCyber
                </span>
              </motion.div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    className="text-[#ccc] hover:text-white transition-colors duration-300 relative group px-3 py-2 rounded-full"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Link href={item.href} className="block">
                      <span className="px-3 py-2 rounded-full hover:bg-white/5 transition-colors duration-300">
                        {item.name}
                      </span>
                      <motion.div 
                        className="absolute inset-0 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                      />
                      <motion.div 
                        className="absolute bottom-1 left-1/2 w-0 h-0.5 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] group-hover:w-4 group-hover:left-1/2 group-hover:-translate-x-1/2 transition-all duration-300" 
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Get Started Button */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="hidden md:block"
              >
                <button
                  onClick={handleGetStarted}
                  className="group relative overflow-hidden bg-gradient-to-r from-[#00d4ff] to-[#00ff88] hover:from-[#0099cc] hover:to-[#00cc66] text-black font-semibold px-6 py-2 text-sm transition-all duration-300 shadow-lg shadow-[#00d4ff]/20 hover:shadow-xl hover:shadow-[#00d4ff]/30 border-0 rounded-full"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                  <span className="relative z-10">Get Started</span>
                </button>
              </motion.div>

              {/* Mobile Menu Button */}
              <motion.button
                className="md:hidden text-white p-2 rounded-full hover:bg-white/10 transition-colors duration-300"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                whileTap={{ scale: 0.9 }}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
            </div>
          </nav>
        </motion.header>

        {/* Mobile Menu */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: isMobileMenuOpen ? 1 : 0,
            scale: isMobileMenuOpen ? 1 : 0.95,
            pointerEvents: isMobileMenuOpen ? 'auto' : 'none'
          }}
          transition={{ duration: 0.2 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 md:hidden"
        >
          <div className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-6 shadow-2xl min-w-[280px]">
            <div className="flex flex-col gap-4">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  className="text-[#ccc] hover:text-white transition-colors duration-300 text-left py-2 px-4 rounded-lg hover:bg-white/5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isMobileMenuOpen ? 1 : 0, x: isMobileMenuOpen ? 0 : -10 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={item.href} className="block w-full" onClick={() => setIsMobileMenuOpen(false)}>
                    {item.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isMobileMenuOpen ? 1 : 0, y: isMobileMenuOpen ? 0 : 10 }}
                transition={{ delay: 0.3 }}
                className="pt-4 border-t border-white/10"
              >
                <button
                  onClick={handleGetStarted}
                  className="w-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] text-black font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover:shadow-lg border-0"
                >
                  Get Started
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Backdrop for mobile menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

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