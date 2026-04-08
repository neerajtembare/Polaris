/**
 * @file components/Login.tsx
 * @description Split-screen login placeholder with 3D starfield background.
 *   No backend auth integrated yet — passes through on form submit.
 * @module @polaris/frontend/components
 */

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import * as THREE from 'three';
import { Shield, Zap, Globe, ArrowRight, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Theme } from '@/types/navigation';

function Stars({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const [sphere] = useState(
    () => random.inSphere(new Float32Array(5000), { radius: 1.5 }) as Float32Array
  );

  useFrame((_state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={isDark ? '#81ecff' : '#0058be'}
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

interface LoginProps {
  theme: Theme;
  onLogin: () => void;
  onToggleTheme: () => void;
}

export default function Login({ theme, onLogin, onToggleTheme }: LoginProps) {
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    onLogin();
  };

  const inputClass = cn(
    'w-full rounded-xl px-4 py-3.5 text-sm border font-medium transition-all focus:outline-none focus:ring-2',
    isDark
      ? 'bg-white/5 border-white/10 text-dark-on-surface placeholder:opacity-30 focus:ring-dark-primary/30'
      : 'bg-surface-container-low border-outline-variant/20 text-on-surface placeholder:opacity-40 focus:ring-primary/20'
  );

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col md:flex-row overflow-hidden',
        isDark ? 'bg-dark-bg text-white' : 'bg-white text-on-surface'
      )}
    >
      {/* Theme toggle — top-right corner */}
      <button
        onClick={onToggleTheme}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={cn(
          'fixed top-4 right-4 z-50 p-2.5 rounded-xl border transition-all active:scale-90 flex items-center gap-1.5',
          isDark
            ? 'bg-white/5 border-white/10 text-dark-primary hover:bg-white/10'
            : 'bg-black/5 border-black/10 text-on-surface-variant hover:bg-black/10 hover:text-primary'
        )}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {isDark ? 'Light' : 'Dark'}
        </span>
      </button>
      {/* Left: Brand + 3D */}
      <div className="relative w-full md:w-1/2 h-[42vh] md:h-screen flex flex-col justify-center px-6 md:px-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 1] }}>
            <Stars isDark={isDark} />
          </Canvas>
        </div>

        <div className="relative z-10 space-y-4 md:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={cn(
              'text-[10px] md:text-sm font-bold uppercase tracking-[0.4em]',
              isDark ? 'text-dark-primary' : 'text-primary'
            )}
          >
            Intelligence Protocol
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-8xl font-black tracking-tighter leading-none"
          >
            Polaris{' '}
            <br />
            <span className={isDark ? 'text-dark-primary' : 'text-primary'}>Systems.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap gap-3 pt-2"
          >
            {[
              { Icon: Shield, label: 'Secure' },
              { Icon: Zap, label: 'Fast' },
              { Icon: Globe, label: 'Local-first' },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold',
                  isDark
                    ? 'bg-white/5 border-white/10 text-dark-on-surface-variant'
                    : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div
        className={cn(
          'w-full md:w-1/2 flex items-center justify-center px-6 py-12 md:py-0',
          isDark ? 'bg-dark-bg/80' : 'bg-surface'
        )}
      >
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={cn(
            'w-full max-w-sm rounded-[2rem] p-8 border shadow-2xl',
            isDark ? 'glass-morphism' : 'bg-white border-outline-variant/20'
          )}
        >
          <h2
            className={cn(
              'text-2xl font-black tracking-tight mb-1',
              isDark ? 'text-dark-on-surface' : 'text-on-surface'
            )}
          >
            Welcome Back
          </h2>
          <p
            className={cn(
              'text-sm mb-8 opacity-60',
              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
            )}
          >
            Sign in to your Polaris account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className={cn('block text-xs font-bold mb-1.5 uppercase tracking-widest opacity-60', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                Email
              </label>
              <input
                id="login-email"
                className={inputClass}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className={cn('block text-xs font-bold mb-1.5 uppercase tracking-widest opacity-60', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                Password
              </label>
              <input
                id="login-password"
                className={inputClass}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-medium">{error}</p>
            )}

            <button
              type="submit"
              className={cn(
                'w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-6',
                isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white'
              )}
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p
            className={cn(
              'text-center text-xs mt-6 opacity-40',
              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
            )}
          >
            Personal activity tracker · Local-first
          </p>
        </motion.div>
      </div>
    </div>
  );
}
