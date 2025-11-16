import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { SEO } from '@/components/seo';

export default function PrivacyPolicy() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [, navigate] = useLocation();
  
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Threat Feed', href: '/threatfeed' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];

  const handleGetStarted = () => {
    navigate('/threatfeed');
  };

  const metaDescription = "Learn about WhatCyber's privacy practices. We are committed to protecting your personal information and ensuring your privacy while using our cybersecurity news aggregator platform.";
  const metaKeywords = "privacy policy, data protection, cybersecurity privacy, personal information, user privacy, privacy practices";
  const ogImage = "https://whatcyber.com/og-image-privacy.png";

  return (
    <>
      <SEO 
        title="Privacy Policy - WhatCyber | Cybersecurity News Aggregator"
        description={metaDescription}
        keywords={metaKeywords}
        image={ogImage}
        url="https://whatcyber.com/privacy/"
      />
      <div className="min-h-screen bg-whatcyber-darker">
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
                  onClick={() => {
                    handleGetStarted();
                    setIsMobileMenuOpen(false);
                  }}
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
            
            <div className="max-w-4xl mx-auto relative">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="text-white">Privacy</span>{' '}
                  <span className="bg-gradient-to-r from-whatcyber-teal to-whatcyber-green bg-clip-text text-transparent">
                    Policy
                  </span>
                </h1>
                <p className="text-xl text-[#888] max-w-2xl mx-auto leading-relaxed">
                  Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 sm:p-12"
              >
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white mb-6">Introduction</h2>
                  <p className="text-[#ccc] mb-6">
                    At WhatCyber, we are committed to protecting your privacy and ensuring the security of your personal information. 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our 
                    website and use our cybersecurity news aggregator services.
                  </p>
                  <p className="text-[#ccc] mb-8">
                    Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
                    please do not access the site or use our services.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Information We Collect</h2>
                  <h3 className="text-xl font-bold text-white mb-4">Personal Information</h3>
                  <p className="text-[#ccc] mb-4">
                    We may collect personally identifiable information that you voluntarily provide to us when you:
                  </p>
                  <ul className="list-disc list-inside text-[#ccc] mb-6 space-y-2">
                    <li>Contact us via our contact form or email</li>
                    <li>Subscribe to our newsletter or mailing list</li>
                    <li>Participate in surveys or promotions</li>
                  </ul>

                  <h3 className="text-xl font-bold text-white mb-4">Usage Data</h3>
                  <p className="text-[#ccc] mb-4">
                    We may automatically collect certain information about your device and how you interact with our website, including:
                  </p>
                  <ul className="list-disc list-inside text-[#ccc] mb-8 space-y-2">
                    <li>IP address</li>
                    <li>Browser type and version</li>
                    <li>Operating system</li>
                    <li>Referring URLs</li>
                    <li>Pages visited and time spent on pages</li>
                  </ul>

                  <h2 className="text-2xl font-bold text-white mb-6">How We Use Your Information</h2>
                  <p className="text-[#ccc] mb-4">
                    We may use the information we collect for various purposes, including:
                  </p>
                  <ul className="list-disc list-inside text-[#ccc] mb-8 space-y-2">
                    <li>To provide, maintain, and improve our services</li>
                    <li>To respond to your inquiries and provide customer support</li>
                    <li>To send you newsletters, marketing, or promotional materials</li>
                    <li>To monitor and analyze usage and trends</li>
                    <li>To detect, prevent, and address technical issues</li>
                    <li>To comply with legal obligations</li>
                  </ul>

                  <h2 className="text-2xl font-bold text-white mb-6">Third-Party Services</h2>
                  <p className="text-[#ccc] mb-4">
                    We may employ third-party companies and individuals to facilitate our services, including:
                  </p>
                  <ul className="list-disc list-inside text-[#ccc] mb-4 space-y-2">
                    <li>Analytics providers (e.g., Google Analytics)</li>
                    <li>Email marketing platforms</li>
                    <li>Form processing services (e.g., Formspree)</li>
                  </ul>
                  <p className="text-[#ccc] mb-8">
                    These third parties have access to your personal information only to perform specific tasks on our behalf 
                    and are obligated not to disclose or use it for any other purpose.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Data Security</h2>
                  <p className="text-[#ccc] mb-8">
                    We implement appropriate technical and organizational security measures to protect the security of your 
                    personal information. However, please note that no method of transmission over the Internet or method 
                    of electronic storage is 100% secure.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Your Data Protection Rights</h2>
                  <p className="text-[#ccc] mb-4">
                    Depending on your location, you may have the following rights regarding your personal information:
                  </p>
                  <ul className="list-disc list-inside text-[#ccc] mb-8 space-y-2">
                    <li>The right to access, update, or delete the information we have about you</li>
                    <li>The right to rectification if your data is inaccurate</li>
                    <li>The right to object to processing of your personal data</li>
                    <li>The right to data portability in certain circumstances</li>
                    <li>The right to withdraw consent where we rely on consent as the legal basis</li>
                  </ul>

                  <h2 className="text-2xl font-bold text-white mb-6">Changes to This Privacy Policy</h2>
                  <p className="text-[#ccc] mb-8">
                    We may update our Privacy Policy from time to time. We will notify you of any changes by posting the 
                    new Privacy Policy on this page and updating the "Last updated" date.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Contact Us</h2>
                  <p className="text-[#ccc] mb-4">
                    If you have any questions about this Privacy Policy, please contact us:
                  </p>
                  <ul className="list-disc list-inside text-[#ccc] mb-8 space-y-2">
                    <li>By email: contact@whatcyber.com</li>
                    <li>By visiting our contact page: <Link href="/contact" className="text-whatcyber-teal hover:underline">https://whatcyber.com/contact</Link></li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
        <footer className="bg-whatcyber-dark border-t border-whatcyber-light-gray/30 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-slate-400 text-sm">
              <p>© {new Date().getFullYear()} WhatCyber. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}