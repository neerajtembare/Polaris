import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Theme } from '@/src/types';

interface ConstellationBackgroundProps {
  theme: Theme;
}

function ParticleField({ isDark }: { isDark: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate random points in a sphere
  const particleCount = 400;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution
      const r = 8 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Slow, majestic rotation
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.1;
      
      // Subtle mouse parallax
      const mouseX = (state.pointer.x * Math.PI) / 10;
      const mouseY = (state.pointer.y * Math.PI) / 10;
      
      pointsRef.current.rotation.y += (mouseX - pointsRef.current.rotation.y) * 0.02;
      pointsRef.current.rotation.x += (-mouseY - pointsRef.current.rotation.x) * 0.02;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={isDark ? "#81ecff" : "#0058be"}
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
      {/* Soft radial gradient mask to fade out edges */}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-bg)_70%)]" 
           style={{ '--color-bg': isDark ? '#020617' : '#f8f9fa' } as React.CSSProperties} />
           
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <fog attach="fog" args={[isDark ? '#020617' : '#f8f9fa', 5, 15]} />
        <ParticleField isDark={isDark} />
      </Canvas>
    </div>
  );
}
