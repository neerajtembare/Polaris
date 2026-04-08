import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Theme } from '@/src/types';

interface TopographicalHeatmapProps {
  theme: Theme;
}

function HeatmapGrid({ theme }: { theme: Theme }) {
  const isDark = theme === 'dark';
  const groupRef = useRef<THREE.Group>(null);

  // Generate mock data for a 7x10 grid
  const gridData = useMemo(() => {
    const data = [];
    for (let x = 0; x < 10; x++) {
      for (let z = 0; z < 7; z++) {
        // Create some "mountains" of activity
        const distanceToCenter = Math.sqrt(Math.pow(x - 5, 2) + Math.pow(z - 3.5, 2));
        const baseHeight = Math.max(0.1, 2 - distanceToCenter * 0.3);
        const randomVariation = Math.random() * 0.5;
        const height = baseHeight + randomVariation;
        
        data.push({
          position: [x - 4.5, height / 2, z - 3],
          height: height,
          intensity: height / 2.5
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
        <mesh key={i} position={item.position as [number, number, number]}>
          <boxGeometry args={[0.8, item.height, 0.8]} />
          <meshStandardMaterial 
            color={isDark ? "#81ecff" : "#0058be"}
            emissive={isDark ? "#81ecff" : "#0058be"}
            emissiveIntensity={isDark ? item.intensity * 0.5 : 0.1}
            transparent
            opacity={0.6 + item.intensity * 0.4}
          />
        </mesh>
      ))}
      
      {/* Base Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial 
          color={isDark ? "#1e293b" : "#e1e3e4"} 
          transparent 
          opacity={0.2} 
        />
      </mesh>

      {/* Grid Lines */}
      <gridHelper args={[12, 12, isDark ? "#81ecff" : "#0058be", isDark ? "#1e293b" : "#e1e3e4"]} position={[0, 0, 0]} />
    </group>
  );
}

export default function TopographicalHeatmap({ theme }: TopographicalHeatmapProps) {
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
        
        <ambientLight intensity={theme === 'dark' ? 0.2 : 0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight 
          position={[-10, 10, 10]} 
          angle={0.15} 
          penumbra={1} 
          intensity={theme === 'dark' ? 2 : 1} 
          color={theme === 'dark' ? "#81ecff" : "#ffffff"}
        />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <HeatmapGrid theme={theme} />
        </Float>
      </Canvas>
      
      {/* Overlay Labels */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">
          Spatial Consistency Matrix
        </p>
      </div>
    </div>
  );
}
