/**
 * @file components/3d/ConstellationBackground.tsx
 * @description Three.js particle sphere with slow rotation and mouse parallax.
 *   Used as a subtle full-viewport background overlay on multiple screens.
 * @module @polaris/frontend/components/3d
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Theme } from '@/types/navigation';

interface ConstellationBackgroundProps {
  theme: Theme;
}

function ParticleField({ isDark }: { isDark: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const particleCount = 400;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 8 * Math.cbrt(Math.random());
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
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.1;

    const mouseX = (state.pointer.x * Math.PI) / 10;
    const mouseY = (state.pointer.y * Math.PI) / 10;
    pointsRef.current.rotation.y += (mouseX - pointsRef.current.rotation.y) * 0.02;
    pointsRef.current.rotation.x += (-mouseY - pointsRef.current.rotation.x) * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={isDark ? '#81ecff' : '#003380'}
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={isDark ? 0.6 : 0.3}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function ConstellationBackground({ theme }: ConstellationBackgroundProps) {
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 z-10"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, ${isDark ? '#020617' : '#f8f9fa'} 70%)`,
        }}
      />
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <fog attach="fog" args={[isDark ? '#020617' : '#f8f9fa', 5, 15]} />
        <ParticleField isDark={isDark} />
      </Canvas>
    </div>
  );
}
