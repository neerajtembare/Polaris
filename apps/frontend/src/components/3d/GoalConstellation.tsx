/**
 * @file components/3d/GoalConstellation.tsx
 * @description Three.js constellation of goal nodes with connecting lines.
 *   Used as a subtle 3D background on the Goals screen.
 * @module @polaris/frontend/components/3d
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { Theme } from '@/types/navigation';

function Constellation({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const nodeCount = 15;

  const nodes = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      pts.push(new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      ));
    }
    return pts;
  }, []);

  const lines = useMemo(() => {
    const connections: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const nodeI = nodes[i];
        const nodeJ = nodes[j];
        if (nodeI && nodeJ && nodeI.distanceTo(nodeJ) < 4) {
          connections.push([nodeI, nodeJ]);
        }
      }
    }
    return connections;
  }, [nodes]);

  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.rotation.x += delta * 0.02;
    }
  });

  const nodeColor = isDark ? '#81ecff' : '#0058be';

  return (
    <group ref={groupRef}>
      {nodes.map((pos, i) => (
        <Sphere key={i} position={pos} args={[0.08, 16, 16]}>
          <meshBasicMaterial color={nodeColor} transparent opacity={0.8} />
        </Sphere>
      ))}
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line}
          color={nodeColor}
          lineWidth={1}
          transparent
          opacity={0.15}
        />
      ))}
    </group>
  );
}

interface GoalConstellationProps {
  theme: Theme;
}

export default function GoalConstellation({ theme }: GoalConstellationProps) {
  const isDark = theme === 'dark';
  return (
    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
      <Canvas camera={{ position: [0, 0, 8] }}>
        <Constellation isDark={isDark} />
      </Canvas>
    </div>
  );
}
