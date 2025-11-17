import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Shield, Menu, X, Database, Eye, Settings, Zap, Target, Github, Linkedin, Mail, Globe, Heart } from 'lucide-react';
import * as THREE from 'three';
import { Helmet } from "react-helmet-async";
import { SEO } from '@/components/seo';

// CyberSphere Component
const CyberSphere = () => {
  const mountRef = React.useRef<HTMLDivElement>(null);
  
  // Refs for interaction state
  const isDragging = React.useRef(false);
  const previousMousePosition = React.useRef({ x: 0, y: 0 });
  const colorWaveState = React.useRef({ active: false, progress: 0, centerX: 0, centerY: 0, centerZ: 0 });
  const clickInfo = React.useRef({ startX: 0, startY: 0, startTime: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);
    mount.style.cursor = 'grab';

    // --- Particle system ---
    const particleCount = 7000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const originalColors = new Float32Array(particleCount * 3);
    const color1 = new THREE.Color('#00d4ff');
    const color2 = new THREE.Color('#00ff88');
    const waveColor = new THREE.Color('#ff0080'); // Pink wave color

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const radius = 2.125;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      // Calculate original color
      const mixedColor = color1.clone().lerp(color2, (y + radius) / (2 * radius));
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
      
      // Store original colors
      originalColors[i3] = mixedColor.r;
      originalColors[i3 + 1] = mixedColor.g;
      originalColors[i3 + 2] = mixedColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Store original colors for the wave effect
    geometry.userData.originalColors = originalColors;

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- Interaction Handlers ---
    const handleMouseDown = (event: MouseEvent) => {
      isDragging.current = true;
      mount.style.cursor = 'grabbing';
      previousMousePosition.current = { x: event.clientX, y: event.clientY };
      clickInfo.current = { startX: event.clientX, startY: event.clientY, startTime: Date.now() };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = event.clientX - previousMousePosition.current.x;
      const deltaY = event.clientY - previousMousePosition.current.y;
      
      particles.rotation.y += deltaX * 0.005;
      particles.rotation.x += deltaY * 0.005;

      previousMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = (event: MouseEvent) => {
      isDragging.current = false;
      mount.style.cursor = 'grab';

      const { startX, startY, startTime } = clickInfo.current;
      const distance = Math.sqrt(Math.pow(event.clientX - startX, 2) + Math.pow(event.clientY - startY, 2));
      const duration = Date.now() - startTime;

      // If moved less than 10px and held for less than 200ms, it's a click
      if (distance < 10 && duration < 200 && !colorWaveState.current.active) {
        // Pick a random point on the sphere as the wave center
        const randomIndex = Math.floor(Math.random() * particleCount) * 3;
        colorWaveState.current = { 
          active: true, 
          progress: 0,
          centerX: positions[randomIndex],
          centerY: positions[randomIndex + 1],
          centerZ: positions[randomIndex + 2]
        };
      }
    };
    
    const handleMouseLeave = () => {
      isDragging.current = false;
      mount.style.cursor = 'grab';
    };

    mount.addEventListener('mousedown', handleMouseDown);
    mount.addEventListener('mousemove', handleMouseMove);
    mount.addEventListener('mouseup', handleMouseUp);
    mount.addEventListener('mouseleave', handleMouseLeave);

    // --- Animation Loop ---
    let requestId: number;
    const animate = () => {
      requestId = requestAnimationFrame(animate);
      
      // Auto-rotation when not being dragged
      if (!isDragging.current) {
        particles.rotation.y += 0.0005;
      }

      // Handle color wave animation
      if (colorWaveState.current.active) {
        colorWaveState.current.progress += 0.03;
        const waveRadius = colorWaveState.current.progress * 8; // Wave expansion speed
        const waveWidth = 1.5; // Width of the color wave
        
        const colors = geometry.attributes.color.array;
        const originalColors = geometry.userData.originalColors;
        const { centerX, centerY, centerZ } = colorWaveState.current;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          const x = positions[i3];
          const y = positions[i3 + 1];
          const z = positions[i3 + 2];
          
          // Calculate distance from wave center
          const distanceFromCenter = Math.sqrt(
            Math.pow(x - centerX, 2) + 
            Math.pow(y - centerY, 2) + 
            Math.pow(z - centerZ, 2)
          );
          
          // Create wave effect
          const waveIntensity = Math.max(0, 1 - Math.abs(distanceFromCenter - waveRadius) / waveWidth);
          
          if (waveIntensity > 0) {
            // Blend original color with wave color
            const originalR = originalColors[i3];
            const originalG = originalColors[i3 + 1];
            const originalB = originalColors[i3 + 2];
            
            colors[i3] = originalR + (waveColor.r - originalR) * waveIntensity;
            colors[i3 + 1] = originalG + (waveColor.g - originalG) * waveIntensity;
            colors[i3 + 2] = originalB + (waveColor.b - originalB) * waveIntensity;
          } else {
            // Return to original color
            colors[i3] = originalColors[i3];
            colors[i3 + 1] = originalColors[i3 + 1];
            colors[i3 + 2] = originalColors[i3 + 2];
          }
        }
        
        geometry.attributes.color.needsUpdate = true;
        
        // Reset after wave has traveled across the entire sphere
        if (colorWaveState.current.progress > 2) {
          colorWaveState.current.active = false;
          colorWaveState.current.progress = 0;
          // Restore all original colors
          colors.set(originalColors);
          geometry.attributes.color.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---
    return () => {
      mount.removeEventListener('mousedown', handleMouseDown);
      mount.removeEventListener('mousemove', handleMouseMove);
      mount.removeEventListener('mouseup', handleMouseUp);
      mount.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(requestId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <motion.div 
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      <div ref={mountRef} className="w-full h-full" />
    </motion.div>
  );
};

// Header Component
const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    window.location.href = '/threatfeed';
  };

  const navItems = [
    { name: 'Features', href: '/#features' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleNavigation = (href: string) => {
    setIsMobileMenuOpen(false);
    
    // For anchor links on the homepage
    if (href.startsWith('/#')) {
      // If we're on the homepage, scroll to the section
      const element = document.querySelector(href.substring(1)); // Remove the '/' prefix
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } 
    // For internal pages, we'll let the Link component handle navigation
    // For external links
    else if (!href.startsWith('/')) {
      window.open(href, '_blank');
    }
  };

  const handleLogoClick = () => {
    // If we're on the homepage, scroll to top
    if (window.location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } 
    // If we're on another page, navigate to homepage
    else {
      window.location.href = '/';
    }
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className={`fixed inset-x-0 mx-auto w-fit z-50 transition-all duration-300 ${
          isScrolled ? 'top-4' : 'top-6'
        }`}
      >
        <nav className={`relative backdrop-blur-md bg-black/20 border border-white/10 rounded-full px-6 py-3 shadow-2xl transition-all duration-300 ${
          isScrolled ? 'bg-black/30' : ''
        }`}>
          
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[rgba(0,212,255,0.1)] via-transparent to-[rgba(0,255,136,0.1)] opacity-50" />
          
          <div className="flex items-center justify-between gap-8 relative z-10">
            
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-2 cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              onClick={handleLogoClick}
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
                <Link href={item.href} className="block w-full">
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
    </>
  );
};

// HeroSection Component
const HeroSection = () => {
  const [currentText, setCurrentText] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const heroTexts = [
    "Cybersecurity News",
    "Latest CVEs",
    "Threat Intelligence",
    "Security Updates"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentText((prev) => (prev + 1) % heroTexts.length);
    }, 3000);

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      id="home" 
      className="min-h-screen relative overflow-hidden flex items-center"
      style={{
        background: `
          radial-gradient(ellipse 120% 100% at 30% 50%, rgba(0, 212, 255, 0.08), transparent),
          radial-gradient(ellipse 80% 120% at 70% 20%, rgba(0, 255, 136, 0.06), transparent),
          linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)
        `
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        {/* Parallax background elements with blur */}
        <motion.div 
          className="absolute top-20 right-20 w-32 h-32 border border-[#00ff88]/10 rotate-12 backdrop-blur-xs"
          style={{ y: scrollY * -0.2 }}
        />
        <motion.div 
          className="absolute bottom-32 left-20 w-24 h-24 border border-[#00d4ff]/15 rounded-full backdrop-blur-xs"
          style={{ y: scrollY * -0.3 }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/3 w-16 h-16 border border-[#00ff88]/8 rotate-45 backdrop-blur-xs"
          style={{ y: scrollY * -0.4 }}
        />
        
        <motion.div
          className="absolute top-1/4 left-1/4 w-72 h-72 bg-[rgba(0,255,136,0.05)] rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgba(0,212,255,0.05)] rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-[rgba(0,212,255,0.1)] to-[rgba(0,255,136,0.1)] backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
            >
              <Shield className="h-4 w-4 text-[#00d4ff]" />
              <span className="text-[#00d4ff] text-sm font-medium">Cybersecurity News Aggregator</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <span className="text-[#666]">Stay Ahead with</span>{' '}
              <span className="relative">
                <motion.span
                  key={currentText}
                  className="bg-gradient-to-r from-[#00d4ff] via-[#00ff88] to-[#00d4ff] bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% 100%' }}
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    opacity: 1, 
                    y: 0 
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    backgroundPosition: { duration: 5, repeat: Infinity },
                    opacity: { duration: 0.5 },
                    y: { duration: 0.5 }
                  }}
                >
                  {heroTexts[currentText]}
                </motion.span>
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg text-[#888] mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Your centralized hub for cybersecurity news, latest CVE vulnerabilities, and threat intelligence. 
              Stay informed with real-time updates from trusted security sources.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              className="flex justify-center lg:justify-start"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.button
                onClick={() => window.open('https://www.whatcyber.com/threatfeed', '_blank')}
                className="group relative overflow-hidden bg-gradient-to-r from-[#00d4ff] to-[#00ff88] hover:from-[#0099cc] hover:to-[#00cc66] text-black font-semibold px-8 py-4 text-lg transition-all duration-300 shadow-lg shadow-[#00d4ff]/20 hover:shadow-xl hover:shadow-[#00d4ff]/30 border-0 rounded-full"
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 0 30px rgba(0, 212, 255, 0.4)" 
                }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
                <span className="relative z-10">Get Started</span>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Content - 3D Sphere */}
          <motion.div
            className="relative h-96 lg:h-[600px] z-10"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="w-full h-full relative z-10">
              <CyberSphere />
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
          onClick={scrollToFeatures}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          whileHover={{ scale: 1.1 }}
        >
          <motion.div
            className="flex flex-col items-center space-y-2 text-[#666] hover:text-[#00d4ff] transition-colors"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-sm">Scroll to explore</span>
            <ChevronDownIcon className="h-6 w-6" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// FeaturesSection Component
const FeaturesSection = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Database,
      title: "Real-Time Aggregation",
      description: "Stay ahead of threats with instant updates from sources like Bleeping Computer, Unit 42, and Dark Reading.",
      delay: 0.2
    },
    {
      icon: Eye,
      title: "Centralized Dashboard",
      description: "One unified view for all your intelligence feeds. No more tab-switching between different sources.",
      delay: 0.4
    },
    {
      icon: Settings,
      title: "Customizable Sources",
      description: "Tailor your feed. Add or remove any RSS source to create a personalized intelligence hub.",
      delay: 0.6
    }
  ];

  return (
    <section 
      id="features"
      className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 100% 80% at 20% 50%, rgba(0, 255, 136, 0.05), transparent),
          radial-gradient(ellipse 80% 100% at 80% 20%, rgba(0, 212, 255, 0.08), transparent),
          linear-gradient(180deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)
        `
      }}
    >
      {/* Parallax background elements with blur */}
      <motion.div 
        className="absolute top-10 right-10 w-32 h-32 border border-[#00ff88]/10 rotate-12 backdrop-blur-xs"
        style={{ y: scrollY * -0.3 }}
      />
      <motion.div 
        className="absolute bottom-20 left-10 w-24 h-24 border border-[#00d4ff]/15 rounded-full backdrop-blur-xs"
        style={{ y: scrollY * -0.4 }}
      />

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="text-[#666]">Key</span>{' '}
            <motion.span 
              className="bg-gradient-to-r from-[#00d4ff] via-[#00ff88] to-[#00d4ff] bg-clip-text text-transparent"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              Features
            </motion.span>
          </h2>
          <p className="text-lg sm:text-xl text-[#888] max-w-3xl mx-auto leading-relaxed px-4">
            Essential capabilities of our cybersecurity news aggregator platform
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: feature.delay }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              {/* Card with backdrop blur */}
              <div className="bg-white/5 backdrop-blur-lg p-6 sm:p-8 rounded-2xl border border-white/10 hover:border-[#00d4ff] transition-all duration-500 shadow-2xl shadow-black/20 hover:shadow-[0_20px_40px_rgba(0,212,255,0.15)] relative overflow-hidden h-full">
                {/* Animated background gradient */}
                <motion.div 
                  className="absolute -inset-2 bg-gradient-to-br from-transparent via-[rgba(0,212,255,0.1)] to-transparent opacity-0 group-hover:opacity-100"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                
                <div className="relative z-10">
                  {/* Animated icon container */}
                  <motion.div
                    className="mb-4 sm:mb-6 relative"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#00d4ff] to-[#00ff88] rounded-xl flex items-center justify-center shadow-[0_8px_20px_rgba(0,212,255,0.3)] group-hover:shadow-[0_12px_30px_rgba(0,212,255,0.4)] transition-shadow duration-300 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-black relative z-10" />
                    </div>
                  </motion.div>

                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white group-hover:text-[#00d4ff] transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-[#ccc] leading-relaxed text-sm sm:text-base mb-4">
                    {feature.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-[#666]">
                    <motion.div
                      className="w-2 h-2 bg-[#00ff88] rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    Active
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// TimelineSection Component
const TimelineSection = () => {
  const steps = [
    {
      icon: Eye,
      title: "Discover",
      description: "Aggregate real-time cybersecurity news and CVE alerts from trusted sources worldwide.",
      number: "01"
    },
    {
      icon: Target,
      title: "Analyze",
      description: "Filter and prioritize relevant threats based on your specific interests and requirements.",
      number: "02"
    },
    {
      icon: Zap,
      title: "Act",
      description: "Stay informed and take proactive measures to protect your digital assets effectively.",
      number: "03"
    }
  ];

  return (
    <section 
      id="timeline"
      className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 120% 100% at 50% 0%, rgba(0, 212, 255, 0.08), transparent),
          radial-gradient(ellipse 80% 120% at 100% 50%, rgba(0, 255, 136, 0.06), transparent),
          linear-gradient(135deg, #111111 0%, #0a0a0a 50%, #111111 100%)
        `
      }}
    >
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="text-[#666]">How It</span>{' '}
            <motion.span 
              className="bg-gradient-to-r from-[#00d4ff] via-[#00ff88] to-[#00d4ff] bg-clip-text text-transparent"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              Works
            </motion.span>
          </h2>
          <p className="text-lg sm:text-xl text-[#888] max-w-3xl mx-auto px-4">
            Your streamlined approach to cybersecurity intelligence gathering
          </p>
        </motion.div>

        <div className="relative">
          {/* Enhanced connection line with gradient flow and blur */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px transform -translate-x-1/2 hidden lg:block overflow-visible">
            <div className="w-full h-full bg-gradient-to-b from-[#00d4ff] via-[#00ff88] to-[#00d4ff] opacity-30" />
            <motion.div
              className="absolute inset-0 w-full bg-gradient-to-b from-transparent via-white/50 to-transparent"
              animate={{ y: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ filter: 'blur(4px)' }}
            />
          </div>

          <div className="space-y-12 sm:space-y-16 lg:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className={`flex flex-col lg:flex-row items-center gap-6 sm:gap-8 ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Content with glassmorphism */}
                <motion.div 
                  className="flex-1 text-center lg:text-left w-full"
                >
                  <div className="bg-white/5 backdrop-blur-lg p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden group hover:border-[#00d4ff] transition-all duration-500">
                    <motion.div 
                      className="absolute -inset-2 bg-gradient-to-br from-transparent via-[rgba(0,212,255,0.1)] to-transparent opacity-0 group-hover:opacity-100"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                    
                    <div className="relative z-10">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <motion.span 
                          className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#00d4ff] to-[#00ff88] bg-clip-text text-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                          animate={{ 
                            textShadow: [
                              '0 0 10px rgba(0,212,255,0.3)',
                              '0 0 20px rgba(0,255,136,0.3)',
                              '0 0 10px rgba(0,212,255,0.3)'
                            ]
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          {step.number}
                        </motion.span>
                        <h3 className="text-xl sm:text-2xl font-bold text-white text-center sm:text-left group-hover:text-[#00d4ff] transition-colors duration-300">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-[#ccc] text-base sm:text-lg leading-relaxed mb-4">
                        {step.description}
                      </p>
                      <motion.div 
                        className="h-1 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-full"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        transition={{ duration: 1, delay: index * 0.3 }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Enhanced icon circle */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="relative z-10 order-first lg:order-none"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#00d4ff] to-[#00ff88] rounded-full flex items-center justify-center shadow-[0_12px_30px_rgba(0,212,255,0.4)] border-4 border-[#111] relative overflow-hidden group">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                    <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-black relative z-10" />
                  </div>
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-[#00d4ff] animate-ping opacity-20"
                    style={{ 
                      background: 'conic-gradient(from 0deg, transparent, rgba(0,212,255,0.1), transparent)',
                      filter: 'blur(2px)'
                    }}
                  />
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-[#00ff88] animate-ping opacity-20" 
                    style={{ 
                      animationDelay: '0.5s',
                      background: 'conic-gradient(from 180deg, transparent, rgba(0,255,136,0.1), transparent)',
                      filter: 'blur(2px)'
                    }}
                  />
                </motion.div>
                <div className="flex-1 hidden lg:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// FooterSection Component
const FooterSection = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Github, href: "https://github.com/Achuth07", label: "GitHub" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/achuth-chandra/", label: "LinkedIn" },
    { icon: Mail, href: "mailto:contact@whatcyber.com", label: "Email" },
    { icon: Globe, href: "https://www.achuthchandra.me", label: "Portfolio" }
  ];

  return (
    <footer 
      className="border-t border-white/10 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 100% 80% at 50% 100%, rgba(0, 255, 136, 0.05), transparent),
          radial-gradient(ellipse 80% 100% at 20% 80%, rgba(0, 212, 255, 0.08), transparent),
          linear-gradient(180deg, #111111 0%, #0a0a0a 50%, #111111 100%)
        `
      }}
    >
      {/* Parallax background elements */}
      <motion.div 
        className="absolute top-10 left-10 w-24 h-24 border border-[#00ff88]/8 rotate-45 backdrop-blur-xs"
      />
      <motion.div 
        className="absolute bottom-10 right-10 w-16 h-16 border border-[#00d4ff]/10 rounded-full backdrop-blur-xs"
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand Section */}
          <div>
            <motion.div
              className="flex items-center space-x-2 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden group-hover:shadow-lg group-hover:shadow-[#00d4ff]/25 transition-all duration-300">
                <img 
                  src="/android-chrome-192x192.png" 
                  alt="WhatCyber Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-2xl font-bold">
                <span className="text-white">WhatCyber</span>
              </div>
            </motion.div>
            
            <motion.p
              className="text-[#888] mb-6 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              Advanced cybersecurity solutions powered by AI. Protecting your digital assets 
              with next-generation threat intelligence and automated defense systems.
            </motion.p>
            
            <motion.div
              className="flex space-x-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {socialLinks.map((link, index) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 backdrop-blur-lg rounded-lg flex items-center justify-center text-[#666] hover:text-[#00d4ff] hover:bg-white/10 border border-white/10 hover:border-[#00d4ff] transition-all duration-300 shadow-lg"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <link.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </motion.div>
          </div>

          {/* Quick Links */}
          <motion.div
            className="grid grid-cols-2 gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-[#888]">
                <li><Link href="/about" className="hover:text-[#00d4ff] transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-[#00d4ff] transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-[#888]">
                <li><Link href="/privacy" className="hover:text-[#00d4ff] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#00d4ff] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          className="py-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center space-x-2 text-[#666] text-sm">
            <span>© {currentYear} WhatCyber. All rights reserved.</span>
            <span className="text-[#444]">•</span>
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500 fill-current" />
            <span>by</span>
            <motion.a
              href="https://www.achuthchandra.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00d4ff] hover:text-[#00ff88] transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Achuth Chandra
            </motion.a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

// ChevronDownIcon Component
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// Main LandingPage Component
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <SEO 
        title="WhatCyber: The Cybersecurity News Aggregator"
        description="Get your real-time cybersecurity news feed from WhatCyber. We aggregate the latest threat intelligence, vulnerabilities, and cyber news from top sources."
        keywords="cybersecurity, threat intelligence, news aggregator, vulnerability tracking, cyber news, security alerts"
      />
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TimelineSection />
      </main>
      <FooterSection />
    </div>
  );
}