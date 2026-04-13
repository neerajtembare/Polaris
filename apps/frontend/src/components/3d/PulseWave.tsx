/**
 * @file components/3d/PulseWave.tsx
 * @description Distorted plane mesh with sinusoidal rotation and wireframe rendering.
 *   Used as a sci-fi background in the Insights screen.
 * @module @polaris/frontend/components/3d
 */

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Theme } from '@/types/navigation';

interface PulseWaveProps {
  theme: Theme;
}

function WaveMesh({ isDark }: { isDark: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 3, 0, 0]}>
      <planeGeometry args={[15, 15, 64, 64]} />
      <MeshDistortMaterial
        color={isDark ? '#81ecff' : '#003380'}
        speed={2}
        distort={0.4}
        radius={1}
        wireframe={true}
        transparent
        opacity={isDark ? 0.3 : 0.15}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

export default function PulseWave({ theme }: PulseWaveProps) {
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full absolute inset-0 z-0 opacity-50">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <WaveMesh isDark={isDark} />
      </Canvas>
    </div>
  );
}
