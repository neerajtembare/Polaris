/**
 * @file components/3d/TopographicalHeatmap.tsx
 * @description 7×10 procedural box grid visualizing activity density as a 3D heatmap.
 *   Supports orbit controls and floating animation.
 * @module @polaris/frontend/components/3d
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { Theme } from '@/types/navigation';

interface TopographicalHeatmapProps {
  theme: Theme;
}

function HeatmapGrid({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const gridData = useMemo(() => {
    const data: { position: [number, number, number]; height: number; intensity: number }[] = [];
    for (let x = 0; x < 10; x++) {
      for (let z = 0; z < 7; z++) {
        const distanceToCenter = Math.sqrt(Math.pow(x - 5, 2) + Math.pow(z - 3.5, 2));
        const baseHeight = Math.max(0.1, 2 - distanceToCenter * 0.3);
        const height = baseHeight + Math.random() * 0.5;
        data.push({
          position: [x - 4.5, height / 2, z - 3],
          height,
          intensity: height / 2.5,
        });
      }
    }
    return data;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {gridData.map((item, i) => (
        <mesh key={i} position={item.position}>
          <boxGeometry args={[0.8, item.height, 0.8]} />
          <meshStandardMaterial
            color={isDark ? '#81ecff' : '#0058be'}
            emissive={isDark ? '#81ecff' : '#0058be'}
            emissiveIntensity={isDark ? item.intensity * 0.5 : 0.1}
            transparent
            opacity={0.6 + item.intensity * 0.4}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color={isDark ? '#1e293b' : '#e1e3e4'} transparent opacity={0.2} />
      </mesh>
      <gridHelper
        args={[12, 12, isDark ? '#81ecff' : '#0058be', isDark ? '#1e293b' : '#e1e3e4']}
        position={[0, 0, 0]}
      />
    </group>
  );
}

export default function TopographicalHeatmap({ theme }: TopographicalHeatmapProps) {
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-[400px] relative cursor-grab active:cursor-grabbing">
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={40} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.5}
        />
        <ambientLight intensity={isDark ? 0.2 : 0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight
          position={[-10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={isDark ? 2 : 1}
          color={isDark ? '#81ecff' : '#ffffff'}
        />
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <HeatmapGrid isDark={isDark} />
        </Float>
      </Canvas>
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">
          Activity Matrix
        </p>
      </div>
    </div>
  );
}
