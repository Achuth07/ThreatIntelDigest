import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { SEO } from '@/components/seo';

export default function TermsOfService() {
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

  const metaDescription = "Review WhatCyber's Terms of Service to understand the rules and regulations for using our cybersecurity news aggregator platform and services.";
  const metaKeywords = "terms of service, terms and conditions, user agreement, cybersecurity platform terms, whatcyber terms, service agreement";
  const ogImage = "https://whatcyber.com/og-image-terms.png";

  return (
    <>
      <SEO 
        title="Terms of Service - WhatCyber | Cybersecurity News Aggregator"
        description={metaDescription}
        keywords={metaKeywords}
        image={ogImage}
        url="https://whatcyber.com/terms/"
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
                  <span className="text-white">Terms of</span>{' '}
                  <span className="bg-gradient-to-r from-whatcyber-teal to-whatcyber-green bg-clip-text text-transparent">
                    Service
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
                    Welcome to WhatCyber. These Terms of Service ("Terms") govern your access to and use of our website 
                    and services, including our cybersecurity news aggregator platform.
                  </p>
                  <p className="text-[#ccc] mb-8">
                    By accessing or using our services, you agree to be bound by these Terms and our Privacy Policy. 
                    If you do not agree to these Terms, you must not access or use our services.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Services Description</h2>
                  <p className="text-[#ccc] mb-8">
                    WhatCyber provides a cybersecurity news aggregator platform that collects and displays information 
                    from various cybersecurity sources. Our services are provided for informational purposes only and 
                    do not constitute professional cybersecurity advice.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Intellectual Property</h2>
                  <p className="text-[#ccc] mb-4">
                    The content, features, and functionality of our services are owned by WhatCyber and are protected 
                    by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>
                  <p className="text-[#ccc] mb-8">
                    Our platform aggregates content from third-party sources. All trademarks, service marks, and 
                    copyrights associated with third-party content remain the property of their respective owners.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">User Responsibilities</h2>
                  <p className="text-[#ccc] mb-4">
                    When using our services, you agree not to:
                  </p>
                  <ul className="list-disc list-inside text-[#ccc] mb-8 space-y-2">
                    <li>Use the services for any illegal or unauthorized purpose</li>
                    <li>Interfere with or disrupt the services or servers connected to the services</li>
                    <li>Attempt to gain unauthorized access to any portion of the services</li>
                    <li>Transmit any viruses or malicious code</li>
                    <li>Use the services to distribute spam or unsolicited messages</li>
                  </ul>

                  <h2 className="text-2xl font-bold text-white mb-6">Disclaimer of Warranties</h2>
                  <p className="text-[#ccc] mb-8">
                    Our services are provided "as is" and "as available" without warranties of any kind, either express 
                    or implied. We do not warrant that the services will be uninterrupted, secure, or error-free.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Limitation of Liability</h2>
                  <p className="text-[#ccc] mb-8">
                    To the maximum extent permitted by law, WhatCyber shall not be liable for any indirect, incidental, 
                    special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
                    directly or indirectly.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Third-Party Links</h2>
                  <p className="text-[#ccc] mb-8">
                    Our services may contain links to third-party websites or services that are not owned or controlled 
                    by WhatCyber. We have no control over, and assume no responsibility for, the content, privacy policies, 
                    or practices of any third-party websites or services.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Changes to Terms</h2>
                  <p className="text-[#ccc] mb-8">
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                    We will provide notice of any significant changes by updating the "Last updated" date at the 
                    top of this page.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Governing Law</h2>
                  <p className="text-[#ccc] mb-8">
                    These Terms shall be governed and construed in accordance with the laws of the United States of America, 
                    without regard to its conflict of law provisions.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-6">Contact Us</h2>
                  <p className="text-[#ccc] mb-4">
                    If you have any questions about these Terms of Service, please contact us:
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