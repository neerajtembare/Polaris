/**
 * @file components/3d/FocusCore.tsx
 * @description Interactive icosahedron that morphs based on a focusScore prop.
 *   High focus = smooth, fast rotation. Low focus = distorted, slow rotation.
 * @module @polaris/frontend/components/3d
 */

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Theme } from '@/types/navigation';

interface FocusCoreProps {
  theme: Theme;
  /** 0–100: drives distortion and rotation speed */
  focusScore: number;
}

function CoreShape({ isDark, focusScore }: { isDark: boolean; focusScore: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const normalizedFocus = focusScore / 100;
  const speed = 0.5 + normalizedFocus * 2;
  const distort = 0.8 - normalizedFocus * 0.6;

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed * 0.5;
      meshRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <Icosahedron ref={meshRef} args={[1, 4]} scale={1.5}>
      <MeshDistortMaterial
        color={isDark ? '#81ecff' : '#0058be'}
        emissive={isDark ? '#003366' : '#001133'}
        emissiveIntensity={0.5}
        wireframe={isDark}
        distort={distort}
        speed={speed * 2}
        roughness={0.2}
        metalness={0.8}
      />
    </Icosahedron>
  );
}

export default function FocusCore({ theme, focusScore }: FocusCoreProps) {
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full absolute inset-0 z-0 opacity-60 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={isDark ? 0.5 : 1} />
        <directionalLight position={[2, 2, 5]} intensity={isDark ? 1 : 2} />
        <CoreShape isDark={isDark} focusScore={focusScore} />
      </Canvas>
    </div>
  );
}
