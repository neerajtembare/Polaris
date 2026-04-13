/**
 * @file components/ui/ReactiveCard.tsx
 * @description Card with 3D tilt and spotlight effects powered by Framer Motion.
 *   Mouse position drives rotateX/rotateY springs and a radial spotlight overlay.
 * @module @polaris/frontend/components/ui
 */

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Theme } from '@/types/navigation';

interface ReactiveCardProps {
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
  onClick?: () => void;
}

export default function ReactiveCard({ children, className, isDark, onClick }: ReactiveCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Tilt physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['5deg', '-5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-5deg', '5deg']);

  // Spotlight
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightColor = isDark ? 'rgba(129, 236, 255, 0.15)' : 'rgba(0, 88, 190, 0.08)';
  const background = useMotionTemplate`radial-gradient(circle 250px at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseXRel = e.clientX - rect.left;
    const mouseYRel = e.clientY - rect.top;
    x.set(mouseXRel / rect.width - 0.5);
    y.set(mouseYRel / rect.height - 0.5);
    mouseX.set(mouseXRel);
    mouseY.set(mouseYRel);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={cn(
        'relative rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl transition-shadow duration-500',
        isDark ? 'glass-morphism' : 'bg-white',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-0 transition-opacity duration-300"
        style={{ background, opacity: isHovered ? 1 : 0 }}
      />
      {/* Content layer */}
      <div className="relative z-10 h-full w-full" style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </motion.div>
  );
}
