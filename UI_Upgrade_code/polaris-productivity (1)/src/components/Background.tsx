import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import { Theme } from '@/src/types';

function Stars({ theme, ...props }: any) {
  const ref = useRef<any>(null);
  const [sphere] = useState(() => random.inSphere(new Float32Array(3000), { radius: 1.5 }) as Float32Array);
  
  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 20;
    ref.current.rotation.y -= delta / 25;
  });

  const isDark = theme === 'dark';

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color={isDark ? "#81ecff" : "#0058be"}
          size={isDark ? 0.0015 : 0.002}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={isDark ? 0.4 : 0.15}
        />
      </Points>
    </group>
  );
}

interface BackgroundProps {
  theme: Theme;
}

export default function Background({ theme }: BackgroundProps) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Stars theme={theme} />
      </Canvas>
    </div>
  );
}
