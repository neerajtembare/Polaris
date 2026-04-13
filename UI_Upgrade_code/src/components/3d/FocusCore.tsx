import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import { Theme } from '@/src/types';

interface FocusCoreProps {
  theme: Theme;
  focusScore: number; // 0 to 100
}

function CoreShape({ isDark, focusScore }: { isDark: boolean, focusScore: number }) {
  const meshRef = useRef<any>(null);
  
  // Calculate speed and distortion based on focus score
  // High focus = smooth, fast rotation. Low focus = distorted, slow rotation.
  const normalizedFocus = focusScore / 100;
  const speed = 0.5 + (normalizedFocus * 2);
  const distort = 0.8 - (normalizedFocus * 0.6); // 0.2 when high focus, 0.8 when low

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed * 0.5;
      meshRef.current.rotation.y += delta * speed;
    }
  });

  const color = isDark ? '#81ecff' : '#0058be';
  const emissive = isDark ? '#003366' : '#001133';

  return (
    <Icosahedron ref={meshRef} args={[1, 4]} scale={1.5}>
      <MeshDistortMaterial
        color={color}
        emissive={emissive}
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
