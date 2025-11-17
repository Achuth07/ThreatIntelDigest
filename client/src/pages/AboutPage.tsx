import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-whatcyber-darker text-slate-100">
      <Helmet>
        <title>About WhatCyber - Cybersecurity News Aggregator</title>
        <meta 
          name="description" 
          content="Learn about WhatCyber's mission to aggregate cybersecurity news and threat intelligence from trusted sources. Discover how our platform helps security professionals stay informed." 
        />
        <meta 
          name="keywords" 
          content="cybersecurity news aggregator, threat intelligence platform, about us, cybersecurity sources, security research" 
        />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            About <span className="text-whatcyber-teal">WhatCyber</span>
          </h1>
          
          <div className="bg-whatcyber-dark rounded-lg p-6 mb-8 border border-whatcyber-gray">
            <h2 className="text-2xl font-semibold mb-4 text-whatcyber-teal">Our Mission</h2>
            <p className="mb-4 text-slate-300">
              WhatCyber is dedicated to making cybersecurity intelligence accessible and actionable for security professionals worldwide. 
              We believe that staying informed about the latest threats shouldn't be time-consuming or fragmented across multiple sources.
            </p>
            <p className="text-slate-300">
              Our platform is designed for security analysts, incident responders, and cybersecurity teams who need real-time access to 
              threat intelligence without the noise.
            </p>
          </div>
          
          <div className="bg-whatcyber-dark rounded-lg p-6 mb-8 border border-whatcyber-gray">
            <h2 className="text-2xl font-semibold mb-4 text-whatcyber-teal">How It Works</h2>
            <p className="mb-4 text-slate-300">
              WhatCyber aggregates cybersecurity news and threat intelligence from 25+ trusted sources including vendor research blogs, 
              government agencies, specialized threat research teams, and general security news outlets.
            </p>
            <p className="text-slate-300">
              Our system continuously monitors these sources, extracts relevant information, and presents it in a clean, organized feed 
              that allows security professionals to quickly identify and respond to emerging threats.
            </p>
          </div>
          
          <div className="bg-whatcyber-dark rounded-lg p-6 mb-8 border border-whatcyber-gray">
            <h2 className="text-2xl font-semibold mb-4 text-whatcyber-teal">Why Trust Us</h2>
            <p className="mb-4 text-slate-300">
              We are committed to providing high-quality, actionable intelligence. Our team carefully vets and maintains our list of 
              cybersecurity sources to ensure we're delivering the most relevant and reliable information.
            </p>
            <p className="text-slate-300">
              You can see our full list of vetted <Link href="/sources" className="text-whatcyber-teal underline hover:text-whatcyber-green">cybersecurity sources here</Link>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}