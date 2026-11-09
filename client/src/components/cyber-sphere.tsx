import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// Interactive 3D particle sphere for the landing page hero. Kept in its own file so three.js
// loads only when the landing page shows it, not for every page of the app.
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

export default CyberSphere;
