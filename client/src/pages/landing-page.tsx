import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Shield, Menu, X, Database, Eye, Settings, Zap, Target, Github, Linkedin, Mail, Globe, Heart, Twitter, ChevronDownIcon, HelpCircle, Plus, Minus, FileText, ShieldAlert, Users, Activity } from 'lucide-react';
import * as THREE from 'three';
import { Helmet } from "react-helmet-async";
import { SEO } from '@/components/seo';
import { getAuthenticatedUser } from '@/lib/auth';

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
    // Check if user is already logged in
    const user = getAuthenticatedUser();

    if (user && user.token) {
      // User is logged in, redirect to threat feed
      window.location.href = '/threatfeed';
    } else {
      // User is not logged in, redirect to login page
      window.location.href = '/login';
    }
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
      const element = document.getElementById(href.substring(2)); // Remove the '/#' prefix
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
        className={`fixed inset-x-0 mx-auto w-fit z-50 transition-all duration-300 ${isScrolled ? 'top-4' : 'top-6'
          }`}
      >
        <nav className={`relative backdrop-blur-md bg-black/20 border border-white/10 rounded-full px-6 py-3 shadow-2xl transition-all duration-300 ${isScrolled ? 'bg-black/30' : ''
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
                  {item.name === 'Features' ? (
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className="block w-full text-left"
                    >
                      <span className="px-3 py-2 rounded-full hover:bg-white/5 transition-colors duration-300">
                        {item.name}
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      />
                      <motion.div
                        className="absolute bottom-1 left-1/2 w-0 h-0.5 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] group-hover:w-4 group-hover:left-1/2 group-hover:-translate-x-1/2 transition-all duration-300"
                      />
                    </button>
                  ) : (
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
                  )}
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
                {item.name === 'Features' ? (
                  <button
                    onClick={() => handleNavigation(item.href)}
                    className="block w-full text-left"
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link href={item.href} className="block w-full">
                    {item.name}
                  </Link>
                )}
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

  const handleGetStarted = () => {
    // Check if user is already logged in
    const user = getAuthenticatedUser();

    if (user && user.token) {
      // User is logged in, redirect to threat feed
      window.location.href = '/threatfeed';
    } else {
      // User is not logged in, redirect to login page
      window.location.href = '/login';
    }
  };

  return (
    <section
      id="home"
      className="min-h-screen relative overflow-hidden flex items-center pt-20"
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
              Actionable Intelligence. Aggregated Daily.
              Your centralized hub for real-time cybersecurity news, vulnerability tracking, and threat actor intelligence.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              className="flex justify-center lg:justify-start"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.button
                onClick={handleGetStarted}
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

      </div>
    </section>
  );
};

// StatsSection Component
const StatsSection = () => {
  const stats = [
    { icon: FileText, value: "20,000+", label: "News Articles Indexed" },
    { icon: ShieldAlert, value: "1,100+", label: "Known Exploited Vulnerabilities" },
    { icon: Users, value: "140+", label: "Threat Actor Profiles" },
    { icon: Activity, value: "Real-Time", label: "Updates" }
  ];

  return (
    <section className="relative z-20 -mt-28 px-4 sm:px-6">
      {/* Transitional background bloom */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[200%] bg-gradient-to-b from-[#00ff88]/10 via-[#00ff88]/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl py-6 px-8 shadow-2xl relative overflow-hidden"
        >
          {/* Animated glow background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/10 via-transparent to-[#00d4ff]/10 animate-gradient-x" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center gap-4 group"
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-[#00ff88]/30">
                  <stat.icon className="w-6 h-6 text-[#00ff88] group-hover:text-[#00d4ff] transition-colors duration-300" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    {stat.value}
                  </h3>
                  <p className="text-xs text-[#888] font-medium uppercase tracking-wider leading-tight">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
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
      title: "Vulnerability Intelligence",
      description: "Advanced sorting and filtering capabilities for CVEs. Quickly identify critical vulnerabilities affecting your infrastructure using our comprehensive dashboard.",
      video: "/latest-cves-demo.mp4",
      webm: "/latest-cves-demo.webm",
      align: "right"
    },
    {
      title: "Exploited Vulnerabilities",
      description: "Stay updated with CISA's Known Exploited Vulnerabilities (KEV) catalog and related news. Prioritize patching based on real-world exploitation data.",
      video: "/exploited-vulnerabilities-demo.mp4",
      webm: "/exploited-vulnerabilities-demo.webm",
      align: "left"
    },
    {
      title: "Threat Actor Directory",
      description: "Comprehensive profiles of threat groups driven by MITRE ATT&CK data. Monitor live activity streams and related news for specific threat actors.",
      video: "/threat-actors-demo.mp4",
      webm: "/threat-actors-demo.webm",
      align: "right"
    }
  ];

  return (
    <section
      id="features"
      className="-mt-24 pt-32 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 100% 80% at 20% 50%, rgba(0, 255, 136, 0.05), transparent),
          radial-gradient(ellipse 80% 100% at 80% 20%, rgba(0, 212, 255, 0.08), transparent),
          linear-gradient(180deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)
        `
      }}
    >
      {/* Background Elements */}
      <motion.div
        className="absolute top-10 right-10 w-32 h-32 border border-[#00ff88]/10 rotate-12 backdrop-blur-xs"
        style={{ y: scrollY * -0.1 }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-[#666]">Platform</span>{' '}
            <motion.span
              className="bg-gradient-to-r from-[#00d4ff] via-[#00ff88] to-[#00d4ff] bg-clip-text text-transparent"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              Features
            </motion.span>
          </h2>
          <p className="text-lg sm:text-xl text-[#888] max-w-3xl mx-auto leading-relaxed">
            Essential capabilities designed for modern threat intelligence
          </p>
        </motion.div>

        <div className="space-y-24">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${feature.align === 'left' ? 'lg:flex-row-reverse' : ''
                }`}
            >
              {/* Text Content */}
              <div className="w-full lg:w-[40%] text-center lg:text-left">
                <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-lg text-[#aaa] leading-relaxed mb-8">
                  {feature.description}
                </p>

                {/* Visual decorative line */}
                <div className={`h-1 w-24 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-full mx-auto lg:mx-0`} />
              </div>

              {/* Video Content */}
              <div className="w-full lg:w-[60%] relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[#00d4ff]/20 to-[#00ff88]/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Video Container */}
                <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 backdrop-blur-sm group-hover:border-[#00d4ff]/30 transition-colors duration-500">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto object-cover rounded-xl"
                  >
                    <source src={feature.webm} type="video/webm" />
                    <source src={feature.video} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Glass overly reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// FAQSection Component
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is WhatCyber?",
      answer: "WhatCyber is a comprehensive cybersecurity threat intelligence aggregator. It collects and organizes the latest security news, CVE vulnerabilities, and threat reports from trusted sources like Bleeping Computer, Unit 42, and Dark Reading into a single, real-time dashboard."
    },
    {
      question: "What are KEVs and why do they matter?",
      answer: "KEVs, or Known Exploited Vulnerabilities, are security flaws that are actively being used by attackers in the wild. We integrate the CISA KEV catalog to help you prioritize patching the most dangerous vulnerabilities first."
    },
    {
      question: "What information is in the Threat Actor profiles?",
      answer: "Our Threat Actor Directory combines MITRE ATT&CK framework data with real-time news. You get detailed insights into an actor's aliases, targeted sectors, methods, and the latest activities associated with them."
    },
    {
      question: "Is WhatCyber free to use?",
      answer: "Yes, WhatCyber offers a free tier that provides access to essential threat intelligence feeds, vulnerability updates, and threat actor profiles. We believe in democratizing access to cybersecurity information."
    },
    {
      question: "How often is the threat feed updated?",
      answer: "Our threat feed is updated in real-time. As soon as our sources publish new information, it is automatically aggregated and displayed on your dashboard, ensuring you never miss critical security updates."
    },
    {
      question: "Can I customize my news sources?",
      answer: "Absolutely. WhatCyber allows you to follow specific RSS feeds and customize your dashboard to focus on the sources and topics that matter most to you and your organization."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-[#666]">Frequently Asked</span>{' '}
            <span className="bg-gradient-to-r from-[#00d4ff] to-[#00ff88] bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm hover:border-[#00d4ff]/50 transition-colors duration-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="text-lg font-medium text-white">{faq.question}</span>
                {openIndex === index ? (
                  <Minus className="w-5 h-5 text-[#00d4ff]" />
                ) : (
                  <Plus className="w-5 h-5 text-[#00ff88]" />
                )}
              </button>
              <motion.div
                initial={false}
                animate={{ height: openIndex === index ? 'auto' : 0, opacity: openIndex === index ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 text-[#aaa] leading-relaxed">
                  {faq.answer}
                </div>
              </motion.div>
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
      title: "Discover KEVs",
      description: "Aggregate real-time cybersecurity news and known exploited vulnerabilities to stay ahead of critical threats.",
      number: "01"
    },
    {
      icon: Target,
      title: "Analyze Actors",
      description: "Deep dive into threat actor profiles, tracking their tactics, techniques, and procedures with MITRE integration.",
      number: "02"
    },
    {
      icon: Zap,
      title: "Act Fast",
      description: "Leverage actionable intelligence to patch vulnerabilities and fortify your defenses against active exploits.",
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
                className={`flex flex-col lg:flex-row items-center gap-6 sm:gap-8 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''
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
    { icon: Linkedin, href: "https://www.linkedin.com/company/whatcyber/", label: "LinkedIn" },
    { icon: Twitter, href: "https://x.com/WhatCyber_", label: "X (Twitter)" },
    { icon: Mail, href: "mailto:contact@whatcyber.com", label: "Email" }
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
              Your centralized hub for real-time cybersecurity news, vulnerability tracking,
              and threat actor intelligence. Stay ahead of emerging threats with WhatCyber.
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
          </div>
        </motion.div>
      </div>
    </footer>
  );
};



// Main LandingPage Component
export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "WhatCyber",
        "applicationCategory": "SecurityApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": "Real-time cybersecurity threat intelligence aggregator and CVE vulnerability tracker."
      },
      {
        "@type": "Organization",
        "name": "WhatCyber",
        "url": "https://whatcyber.com",
        "logo": "https://whatcyber.com/android-chrome-192x192.png",
        "sameAs": [
          "https://x.com/WhatCyber_",
          "https://www.linkedin.com/company/whatcyber/"
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is WhatCyber?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "WhatCyber is a comprehensive cybersecurity threat intelligence aggregator. It collects and organizes the latest security news, CVE vulnerabilities, and threat reports from trusted sources like Bleeping Computer, Unit 42, and Dark Reading into a single, real-time dashboard."
            }
          },
          {
            "@type": "Question",
            "name": "Is WhatCyber free to use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, WhatCyber offers a free tier that provides access to essential threat intelligence feeds and vulnerability updates. We believe in democratizing access to cybersecurity information."
            }
          },
          {
            "@type": "Question",
            "name": "How often is the threat feed updated?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Our threat feed is updated in real-time. As soon as our sources publish new information, it is automatically aggregated and displayed on your dashboard, ensuring you never miss critical security updates."
            }
          },
          {
            "@type": "Question",
            "name": "Can I customize my news sources?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely. WhatCyber allows you to follow specific RSS feeds and customize your dashboard to focus on the sources and topics that matter most to you and your organization."
            }
          },
          {
            "@type": "Question",
            "name": "What kind of vulnerabilities does it track?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We track Common Vulnerabilities and Exposures (CVEs) from the National Vulnerability Database (NVD) and other major security advisories, providing you with details on severity, affected systems, and available patches."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="bg-black min-h-screen text-white selection:bg-[#00d4ff] selection:text-black font-sans overflow-x-hidden">
      <SEO
        title="WhatCyber - ThreatFeed"
        description="Stay updated with the latest cybersecurity threats, vulnerabilities, and intelligence from trusted sources."
        keywords="cybersecurity, threat intelligence, CVE, vulnerabilities, security news, cyber threats"
        structuredData={structuredData}
      />

      <Header />

      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <TimelineSection />
        <FAQSection />
      </main>

      <FooterSection />
    </div>
  );
}