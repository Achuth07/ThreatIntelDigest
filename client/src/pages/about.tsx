import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { SEO } from '@/components/seo';

export default function About() {
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

  const teamMembers = [
    {
      name: "Achuth Chandra",
      role: "Founder & Lead Developer",
      description: "Cybersecurity expert with a passion for creating innovative solutions to protect digital assets.",
      image: "/team/achuth.jpg" // Placeholder - you can add actual images later
    }
  ];

  const metaDescription = "Learn about WhatCyber's mission to make cybersecurity accessible and effective for everyone. Discover our story, values, and team behind the cybersecurity news aggregator platform.";
  const metaKeywords = "cybersecurity, about us, company story, cybersecurity team, threat intelligence platform, security mission";
  const ogImage = "https://whatcyber.com/og-image-about.png";

  return (
    <>
      <SEO 
        title="About WhatCyber - Our Mission & Team | Cybersecurity News Aggregator"
        description={metaDescription}
        keywords={metaKeywords}
        image={ogImage}
        url="https://whatcyber.com/about/"
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
                  <span className="text-white">About</span>{' '}
                  <span className="bg-gradient-to-r from-whatcyber-teal to-whatcyber-green bg-clip-text text-transparent">
                    WhatCyber
                  </span>
                </h1>
                <p className="text-xl text-[#888] max-w-3xl mx-auto leading-relaxed">
                  We're on a mission to make cybersecurity accessible and effective for everyone in the digital world.
                </p>
              </motion.div>

              {/* Story Section */}
              <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
                  <div className="space-y-4 text-[#ccc]">
                    <p>
                      WhatCyber was born from a simple idea: cybersecurity shouldn't be complex or intimidating. 
                      In a world where digital threats are constantly evolving, we believe that staying protected 
                      should be straightforward and accessible to everyone.
                    </p>
                    <p>
                      Founded by cybersecurity professionals who have seen firsthand how confusing and overwhelming 
                      security tools can be, we set out to create a platform that cuts through the noise and delivers 
                      clear, actionable insights.
                    </p>
                    <p>
                      Today, WhatCyber serves as a trusted cybersecurity news aggregator, helping individuals and 
                      businesses stay informed about the latest threats and vulnerabilities without the technical jargon.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10"
                >
                  <h3 className="text-xl font-bold text-white mb-4">Our Mission</h3>
                  <p className="text-[#ccc] mb-6">
                    To empower individuals and organizations with the knowledge and tools they need to navigate 
                    the digital landscape safely and confidently.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-whatcyber-green rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-[#888]">Demystify cybersecurity for everyone</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-whatcyber-green rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-[#888]">Provide real-time threat intelligence</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-whatcyber-green rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-[#888]">Make security accessible and actionable</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Values Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="mb-20"
              >
                <h2 className="text-3xl font-bold text-white text-center mb-12">Our Values</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {[
                    {
                      title: "Transparency",
                      description: "We believe in clear communication without technical jargon or hidden agendas."
                    },
                    {
                      title: "Innovation",
                      description: "Constantly evolving to stay ahead of emerging threats and technologies."
                    },
                    {
                      title: "Accessibility",
                      description: "Making cybersecurity understandable and achievable for everyone."
                    }
                  ].map((value, index) => (
                    <div 
                      key={index}
                      className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10 hover:border-whatcyber-teal transition-all duration-300"
                    >
                      <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                      <p className="text-[#ccc]">{value.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Team Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold text-white text-center mb-12">Our Team</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {teamMembers.map((member, index) => (
                    <div 
                      key={index}
                      className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 bg-gradient-to-r from-whatcyber-teal to-whatcyber-green rounded-full flex items-center justify-center">
                            <span className="text-black font-bold text-xl">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{member.name}</h3>
                            <p className="text-whatcyber-teal">{member.role}</p>
                          </div>
                        </div>
                        <p className="text-[#ccc]">{member.description}</p>
                      </div>
                    </div>
                  ))}
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