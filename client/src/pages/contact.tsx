import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Mail, Menu, X, Send } from 'lucide-react';
import { SEO } from '@/components/seo';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      const response = await fetch('https://formspree.io/f/mrbokbdg', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const metaDescription = "Get in touch with WhatCyber. Have questions about our cybersecurity news aggregator or threat intelligence platform? Contact our team for support, partnerships, or feedback.";
  const metaKeywords = "contact us, cybersecurity support, threat intelligence contact, security platform feedback, get in touch";
  const ogImage = "https://whatcyber.com/og-image-contact.png";

  return (
    <>
      <SEO 
        title="Contact WhatCyber - Get in Touch | Cybersecurity News Aggregator"
        description={metaDescription}
        keywords={metaKeywords}
        image={ogImage}
        url="https://whatcyber.com/contact/"
      />
      <div className="min-h-screen bg-gray-900">
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

        <main className="pt-24">
          {/* Hero Section */}
          <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden">
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
                  <span className="text-white">Get in</span>{' '}
                  <span className="bg-gradient-to-r from-[#00d4ff] to-[#00ff88] bg-clip-text text-transparent">
                    Touch
                  </span>
                </h1>
                <p className="text-xl text-[#888] max-w-3xl mx-auto leading-relaxed">
                  Have questions or feedback? We'd love to hear from you. Reach out and we'll get back to you as soon as possible.
                </p>
              </motion.div>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl font-bold text-white mb-8">Contact Information</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Email</h3>
                        <p className="text-[#ccc]">contact@whatcyber.com</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-4">Follow Us</h3>
                    <p className="text-[#ccc] mb-4">
                      Stay updated with our latest news and security insights.
                    </p>
                    <div className="flex gap-4">
                      <a 
                        href="https://github.com/Achuth07" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#666] hover:text-[#00d4ff] hover:bg-white/20 transition-all duration-300"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/achuth-chandra/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#666] hover:text-[#00d4ff] hover:bg-white/20 transition-all duration-300"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </a>
                      <a 
                        href="https://medium.com/@achuthchandra" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#666] hover:text-[#00d4ff] hover:bg-white/20 transition-all duration-300"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M0 0v24h24v-24h-24zm19.938 5.686l-1.725 1.719c-1.562-1.187-3.703-1.438-5.531-1.438-4.875 0-7.688 2.396-7.688 6.833 0 3.542 2.25 6.292 6.5 6.292 1.708 0 3.271-.354 4.583-.938l1.604 1.604c-1.646.958-3.625 1.542-5.708 1.542-6.625 0-10.333-4.125-10.333-10.333 0-6.208 3.708-10.333 10.333-10.333 5.188 0 8.396 2.708 8.396 7.521 0 1.042-.167 2.063-.438 3.063zm-5.438-1.686c-1.125 0-2.063.938-2.063 2.063s.938 2.063 2.063 2.063 2.063-.938 2.063-2.063-.938-2.063-2.063-2.063z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </motion.div>

                {/* Contact Form */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <div className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10">
                    <h2 className="text-3xl font-bold text-white mb-8">Send us a message</h2>
                    
                    {submitStatus === 'success' && (
                      <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300">
                        Thank you for your message! We'll get back to you soon.
                      </div>
                    )}
                    
                    {submitStatus === 'error' && (
                      <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
                        Oops! Something went wrong. Please try again.
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-[#ccc] mb-2">Name</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent transition-all duration-300"
                          placeholder="Your name"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-[#ccc] mb-2">Email</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent transition-all duration-300"
                          placeholder="your.email@example.com"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="subject" className="block text-[#ccc] mb-2">Subject</label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent transition-all duration-300"
                          placeholder="What's this regarding?"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="message" className="block text-[#ccc] mb-2">Message</label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent transition-all duration-300"
                          placeholder="Your message here..."
                        ></textarea>
                      </div>
                      
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#00d4ff]/30 flex items-center justify-center gap-2 disabled:opacity-70"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Send className="w-5 h-5" />
                        {isSubmitting ? 'Sending...' : 'Send Message'}
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}