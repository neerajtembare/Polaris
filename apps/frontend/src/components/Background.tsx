/**
 * @file components/Background.tsx
 * @description Full-viewport Three.js particle field background.
 *   Renders 600 particles with subtle rotation and mouse parallax.
 *   Adapts color to light/dark theme.
 * @module @polaris/frontend/components
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Theme } from '@/types/navigation';

function ParticleField({ isDark }: { isDark: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const particleCount = 600;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 10 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05;
    const mx = (state.pointer.x * Math.PI) / 10;
    const my = (state.pointer.y * Math.PI) / 10;
    pointsRef.current.rotation.y += (mx - pointsRef.current.rotation.y) * 0.02;
    pointsRef.current.rotation.x += (-my - pointsRef.current.rotation.x) * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={isDark ? '#81ecff' : '#003380'}
        size={isDark ? 0.05 : 0.08}
        sizeAttenuation
        depthWrite={false}
        opacity={isDark ? 0.6 : 0.4}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </Points>
  );
}

interface BackgroundProps {
  theme: Theme;
}

export default function Background({ theme }: BackgroundProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#020617' : '#f8f9fa';

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 z-10"
        style={{ background: `radial-gradient(circle at center, transparent 0%, ${bg} 80%)` }}
      />
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <fog attach="fog" args={[bg, 5, 15]} />
        <ParticleField isDark={isDark} />
      </Canvas>
    </div>
  );
}
