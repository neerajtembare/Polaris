import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import { LogIn, ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Theme } from '@/src/types';

function Stars({ isDark }: { isDark: boolean }) {
  const ref = useRef<any>(null);
  const [sphere] = useState(() => random.inSphere(new Float32Array(5000), { radius: 1.5 }) as Float32Array);
  
  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={isDark ? "#81ecff" : "#0058be"}
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
}

export default function Login({ theme, onLogin }: LoginProps) {
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className={cn(
      "min-h-screen flex flex-col md:flex-row overflow-hidden",
      isDark ? "bg-dark-bg text-white" : "bg-white text-on-surface"
    )}>
      {/* Left Side: Brand & Visuals */}
      <div className="relative w-full md:w-1/2 h-[45vh] md:h-screen flex flex-col justify-center px-6 md:px-20 overflow-hidden">
        {/* Three.js Background */}
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
              "text-[10px] md:text-sm font-bold uppercase tracking-[0.4em]",
              isDark ? "text-dark-primary" : "text-primary"
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
            Polaris <br />
            <span className={isDark ? "text-dark-primary" : "text-primary"}>Systems.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className={cn("max-w-md text-base md:text-lg opacity-80 leading-relaxed", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}
          >
            The next generation of strategic alignment and cognitive productivity. 
            Secure your node to initialize telemetry.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex gap-6 md:gap-8 pt-4 md:pt-8"
          >
            <div className="flex flex-col gap-1">
              <Shield className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">Secure</span>
            </div>
            <div className="flex flex-col gap-1">
              <Zap className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">Fast</span>
            </div>
            <div className="flex flex-col gap-1">
              <Globe className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">Global</span>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-12 left-20 hidden md:block">
          <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase opacity-30">
            <div className="w-12 h-[1px] bg-current"></div>
            <span>v4.0.2 Kinetic</span>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className={cn(
        "w-full md:w-1/2 flex items-center justify-center p-6 md:p-20 relative z-10",
        isDark ? "bg-[#020617]" : "bg-surface"
      )}>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={cn(
            "w-full max-w-md p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl",
            isDark ? "glass-morphism" : "bg-white"
          )}
        >
          <div className="mb-8 md:mb-10">
            <h2 className={cn("text-2xl md:text-3xl font-bold tracking-tight mb-2", isDark ? "text-dark-on-surface" : "text-on-surface")}>Welcome Back</h2>
            <p className={cn("text-sm", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Enter your credentials to access your dashboard.</p>
          </div>

          <form className="space-y-4 md:space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
            <div className="space-y-2">
              <label className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60 ml-1", isDark ? "text-dark-on-surface" : "text-on-surface")}>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className={cn(
                  "w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border transition-all outline-none text-sm md:text-base",
                  isDark 
                    ? "bg-white/5 border-white/10 text-dark-on-surface focus:border-dark-primary/50 focus:ring-4 focus:ring-dark-primary/10" 
                    : "bg-surface border-outline-variant/20 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10"
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60", isDark ? "text-dark-on-surface" : "text-on-surface")}>Password</label>
                <a href="#" className={cn("text-[10px] md:text-xs font-bold", isDark ? "text-dark-primary" : "text-primary")}>Forgot?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border transition-all outline-none text-sm md:text-base",
                  isDark 
                    ? "bg-white/5 border-white/10 text-dark-on-surface focus:border-dark-primary/50 focus:ring-4 focus:ring-dark-primary/10" 
                    : "bg-surface border-outline-variant/20 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10"
                )}
              />
            </div>

            <button 
              type="submit"
              className={cn(
                "w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] group",
                isDark ? "plasma-gradient text-dark-bg" : "signature-gradient text-white"
              )}
            >
              Initialize Session
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className={cn("mt-8 md:mt-10 pt-8 md:pt-10 border-t flex flex-col items-center gap-4 md:gap-6", isDark ? "border-white/10" : "border-outline-variant/20")}>
            <p className={cn("text-xs md:text-sm font-medium", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Or continue with</p>
            <div className="flex gap-3 md:gap-4 w-full">
              <button className={cn(
                "flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl border flex items-center justify-center gap-2 font-bold text-[10px] md:text-sm transition-all hover:bg-current hover:bg-opacity-5",
                isDark ? "border-white/10 text-dark-on-surface" : "border-outline-variant/20 text-on-surface"
              )}>
                <Globe className="w-3 h-3 md:w-4 md:h-4" /> Google
              </button>
              <button className={cn(
                "flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl border flex items-center justify-center gap-2 font-bold text-[10px] md:text-sm transition-all hover:bg-current hover:bg-opacity-5",
                isDark ? "border-white/10 text-dark-on-surface" : "border-outline-variant/20 text-on-surface"
              )}>
                <Shield className="w-3 h-3 md:w-4 md:h-4" /> SSO
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
