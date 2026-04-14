/**
 * @file components/assistant/AssistantAvatar.tsx
 * @description Three.js TARS monolith avatar — fixed floating element.
 *   Replaces the flat AssistantToggle button with a fully 3D animated presence.
 *   Inspired by the TARS robot from Interstellar: tall matte slab, segmented panels,
 *   edge-lit with state-driven color shifts.
 *
 *   States (from assistant.store.tarsState):
 *     idle       — slow float + dim slate pulse
 *     listening  — cyan edge glow + fast pulse + scan line
 *     processing — continuous Y rotation + violet strobe
 *
 * @module @polaris/frontend/components/assistant
 *
 * @dependencies
 * - @react-three/fiber (Canvas, useFrame)
 * - three
 * - stores/assistant.store (tarsState, toggle, messages)
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - stores/assistant.store.ts
 * - App.tsx (renders this instead of AssistantToggle)
 */

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAssistantStore } from '@/stores/assistant.store';

// ---------------------------------------------------------------------------
// Color palette — matched to Tailwind design tokens
// ---------------------------------------------------------------------------
const C_IDLE      = new THREE.Color(0x1e293b); // slate-800
const C_LISTEN    = new THREE.Color(0x22d3ee); // cyan-400
const C_PROCESS   = new THREE.Color(0xa78bfa); // violet-400
const C_BODY      = new THREE.Color(0x040810); // near-black

// ---------------------------------------------------------------------------
// Internal R3F scene — lives inside <Canvas>
// ---------------------------------------------------------------------------
function MonolithScene() {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const scanRef  = useRef<THREE.Mesh>(null);

  // ── Materials — created once, mutated in useFrame ──────────────────────
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color:     C_BODY,
        metalness: 0.45,
        roughness: 0.55,
      }),
    []
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color:      C_IDLE.clone(),
        side:       THREE.BackSide,
        transparent: true,
        opacity:    0.01,
        blending:   THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  // Fixed-length tuple so noUncheckedIndexedAccess never sees undefined
  const segMats = useMemo(
    (): [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial, THREE.MeshBasicMaterial] => [
      new THREE.MeshBasicMaterial({ color: C_IDLE.clone(), transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: C_IDLE.clone(), transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: C_IDLE.clone(), transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false }),
    ],
    []
  );

  const dotMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color:      C_IDLE.clone(),
        transparent: true,
        opacity:    0.15,
      }),
    []
  );

  const scanMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color:      C_LISTEN.clone(),
        transparent: true,
        opacity:    0.0,
        blending:   THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  // ── Animation loop ──────────────────────────────────────────────────────
  const tRef = useRef(0);

  useFrame((_, delta) => {
    tRef.current += delta;
    const t = tRef.current;

    if (!groupRef.current) return;

    // Always get the latest state directly from store to avoid stale closures
    const tarsState = useAssistantStore.getState().tarsState;

    // ── Universal float bob ──────────────────────────────────────────────
    groupRef.current.position.y = Math.sin(t * 1.4) * 0.028;

    // ── Scan line: move top-to-bottom, always on front face ─────────────
    if (scanRef.current) {
      const scanY = 0.69 - ((t * 0.4) % 1.38); // top → bottom in 3.45s
      scanRef.current.position.y = scanY;
    }

    // ── State machine ────────────────────────────────────────────────────
    if (tarsState === 'idle') {
      const pulse = Math.sin(t * Math.PI * 0.7) * 0.5 + 0.5;

      groupRef.current.rotation.y = Math.sin(t * 0.45) * 0.05;

      glowMat.color.set(C_IDLE);
      glowMat.opacity = pulse * 0.05 + 0.005;

      segMats[0].color.set(C_IDLE);  segMats[0].opacity = (Math.sin(t * Math.PI * 0.7)       * 0.5 + 0.5) * 0.10 + 0.02;
      segMats[1].color.set(C_IDLE);  segMats[1].opacity = (Math.sin(t * Math.PI * 0.7 + 0.6)  * 0.5 + 0.5) * 0.10 + 0.02;
      segMats[2].color.set(C_IDLE);  segMats[2].opacity = (Math.sin(t * Math.PI * 0.7 + 1.2)  * 0.5 + 0.5) * 0.10 + 0.02;

      dotMat.color.set(C_IDLE);
      dotMat.opacity = pulse * 0.25 + 0.05;

      scanMat.opacity = 0;

      if (lightRef.current) {
        lightRef.current.color.set(C_IDLE);
        lightRef.current.intensity = pulse * 0.25;
      }

    } else if (tarsState === 'listening') {
      const pulse = Math.sin(t * Math.PI * 3.2) * 0.5 + 0.5; // 1.6Hz

      groupRef.current.rotation.y = Math.sin(t * 0.9) * 0.09;

      glowMat.color.set(C_LISTEN);
      glowMat.opacity = pulse * 0.42 + 0.10;

      segMats[0].color.set(C_LISTEN);  segMats[0].opacity = (Math.sin(t * Math.PI * 3.2)       * 0.5 + 0.5) * 0.55 + 0.15;
      segMats[1].color.set(C_LISTEN);  segMats[1].opacity = (Math.sin(t * Math.PI * 3.2 + 0.8)  * 0.5 + 0.5) * 0.55 + 0.15;
      segMats[2].color.set(C_LISTEN);  segMats[2].opacity = (Math.sin(t * Math.PI * 3.2 + 1.6)  * 0.5 + 0.5) * 0.55 + 0.15;

      dotMat.color.set(C_LISTEN);
      dotMat.opacity = pulse * 0.75 + 0.25;

      scanMat.color.set(C_LISTEN);
      scanMat.opacity = pulse * 0.28 + 0.04;

      if (lightRef.current) {
        lightRef.current.color.set(C_LISTEN);
        lightRef.current.intensity = pulse * 2.8 + 0.6;
      }

    } else {
      // processing: rotate + violet strobe
      groupRef.current.rotation.y += delta * 1.6;

      const shimmer = Math.sin(t * Math.PI * 9.0) * 0.5 + 0.5; // 4.5Hz

      glowMat.color.set(C_PROCESS);
      glowMat.opacity = shimmer * 0.5 + 0.12;

      segMats[0].color.set(C_PROCESS);  segMats[0].opacity = (Math.sin(t * Math.PI * 9.0)       * 0.5 + 0.5) * 0.65 + 0.10;
      segMats[1].color.set(C_PROCESS);  segMats[1].opacity = (Math.sin(t * Math.PI * 9.0 + 1.0)  * 0.5 + 0.5) * 0.65 + 0.10;
      segMats[2].color.set(C_PROCESS);  segMats[2].opacity = (Math.sin(t * Math.PI * 9.0 + 2.0)  * 0.5 + 0.5) * 0.65 + 0.10;

      dotMat.color.set(C_PROCESS);
      dotMat.opacity = shimmer * 0.85 + 0.15;

      scanMat.color.set(C_PROCESS);
      scanMat.opacity = shimmer * 0.35 + 0.05;

      if (lightRef.current) {
        lightRef.current.color.set(C_PROCESS);
        lightRef.current.intensity = shimmer * 3.5 + 0.6;
      }
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight
        ref={lightRef}
        position={[0, 0.3, 2.2]}
        intensity={0.3}
      />

      {/* Monolith group */}
      <group ref={groupRef}>

        {/* Main slab — matte dark steel */}
        <mesh material={bodyMat}>
          <boxGeometry args={[0.62, 1.38, 0.09]} />
        </mesh>

        {/* Glow hull — slightly larger, BackSide, additive */}
        <mesh material={glowMat}>
          <boxGeometry args={[0.74, 1.50, 0.13]} />
        </mesh>

        {/* Horizontal panel dividers — 3 segments on front face */}
        <mesh position={[0, 0.42, 0.051]} material={segMats[0]}>
          <boxGeometry args={[0.62, 0.011, 0.001]} />
        </mesh>
        <mesh position={[0, 0.05, 0.051]} material={segMats[1]}>
          <boxGeometry args={[0.62, 0.011, 0.001]} />
        </mesh>
        <mesh position={[0, -0.26, 0.051]} material={segMats[2]}>
          <boxGeometry args={[0.62, 0.011, 0.001]} />
        </mesh>

        {/* Top status indicator dot */}
        <mesh position={[0, 0.78, 0.052]} material={dotMat}>
          <sphereGeometry args={[0.022, 10, 10]} />
        </mesh>

        {/* Animated scan line — sweeps front face */}
        <mesh ref={scanRef} position={[0, 0.69, 0.053]} material={scanMat}>
          <boxGeometry args={[0.60, 0.009, 0.001]} />
        </mesh>

      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

interface AssistantAvatarProps {
  isDark: boolean;
}

/**
 * Three.js powered TARS monolith avatar, fixed bottom-right.
 * Click to open/close the assistant panel.
 */
export function AssistantAvatar({ isDark: _isDark }: AssistantAvatarProps) {
  const { toggle, isOpen, messages, tarsState } = useAssistantStore();
  const unread = messages.filter((m) => m.role === 'assistant' && m.isNew).length;

  // CSS drop-shadow synced to tarsState for hardware-accelerated outer glow
  const glowFilter =
    tarsState === 'listening'
      ? 'drop-shadow(0 0 14px rgba(34,211,238,0.55)) drop-shadow(0 0 6px rgba(34,211,238,0.3))'
      : tarsState === 'processing'
      ? 'drop-shadow(0 0 14px rgba(167,139,250,0.55)) drop-shadow(0 0 6px rgba(167,139,250,0.3))'
      : 'drop-shadow(0 0 6px rgba(30,41,59,0.25))';

  return (
    <div
      className="fixed bottom-6 right-6 z-40 select-none"
      style={{
        width:  72,
        height: 116,
        filter: glowFilter,
        transition: 'filter 0.4s ease',
      }}
    >
      {/* Transparent click overlay — fixes pointer-events issues with Canvas */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? 'Close TARS assistant' : 'Open TARS assistant'}
        className="absolute inset-0 z-10 cursor-pointer"
        style={{ background: 'transparent', border: 'none', padding: 0 }}
      />

      {/* Three.js Canvas — transparent background */}
      <Canvas
        frameloop="always"
        camera={{ fov: 42, near: 0.1, far: 20, position: [0, 0, 2.8] }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <MonolithScene />
      </Canvas>

      {/* Unread message badge */}
      {!isOpen && unread > 0 && (
        <span
          aria-label={`${unread} unread messages`}
          className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center pointer-events-none"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  );
}
