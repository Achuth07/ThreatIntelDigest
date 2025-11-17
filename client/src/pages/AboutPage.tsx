import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';

export default function AboutPage() {
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
      <Helmet>
        <title>About WhatCyber - Our Mission & Team | Cybersecurity News Aggregator</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={metaKeywords} />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://whatcyber.com/about" />
        <meta property="og:title" content="About WhatCyber - Our Mission & Team | Cybersecurity News Aggregator" />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://whatcyber.com/about" />
        <meta property="twitter:title" content="About WhatCyber - Our Mission & Team | Cybersecurity News Aggregator" />
        <meta property="twitter:description" content={metaDescription} />
        <meta property="twitter:image" content={ogImage} />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://whatcyber.com/about" />
      </Helmet>
      <div className="min-h-screen bg-gray-900">
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
                  <span className="bg-gradient-to-r from-[#00d4ff] to-[#00ff88] bg-clip-text text-transparent">
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
                      <div className="w-2 h-2 bg-[#00ff88] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-[#888]">Demystify cybersecurity for everyone</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#00ff88] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-[#888]">Provide real-time threat intelligence</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#00ff88] rounded-full mt-2 flex-shrink-0"></div>
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
                      className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10 hover:border-[#00d4ff] transition-all duration-300"
                    >
                      <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                      <p className="text-[#ccc]">{value.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Our Curation & Sources Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="mb-20"
              >
                <h2 className="text-3xl font-bold text-white text-center mb-12">
                  Our Curation & Sources
                </h2>
                <div className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10 max-w-3xl mx-auto text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Committed to Transparency
                  </h3>
                  <p className="text-[#ccc] text-lg leading-relaxed mb-6">
                    Our goal is to provide a high-quality, trustworthy feed. We believe in 
                    transparency, which is why we proudly share the full list of authoritative 
                    sources we aggregate from.
                  </p>
                  {/* This is the new Wouter Link */}
                  <Link 
                    href="/sources"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all duration-300"
                  >
                    View All Sources
                  </Link>
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
                          <div className="w-16 h-16 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-full flex items-center justify-center">
                            <span className="text-black font-bold text-xl">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{member.name}</h3>
                            <p className="text-[#00d4ff]">{member.role}</p>
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
      </div>
    </>
  );
}