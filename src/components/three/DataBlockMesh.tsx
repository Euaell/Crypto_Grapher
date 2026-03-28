'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { DataBlock } from '@/lib/algorithms/types';
import * as THREE from 'three';

interface DataBlockMeshProps {
  block: DataBlock;
  highlighted: boolean;
  animate: boolean;
  enterDelay: number;
  dimFactor?: number; // 1.0 = full brightness, 0.0 = invisible
}

export default function DataBlockMesh({ block, highlighted, animate, enterDelay, dimFactor = 1 }: DataBlockMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  const animState = useRef({
    posX: block.x,
    posY: -block.y,
    posZ: block.z,
    scale: 0,
    opacity: 0,
    emissive: 0,
    enterTimer: 0,
    currentDim: dimFactor,
  });

  const targetPos = useRef(new THREE.Vector3(block.x, -block.y, block.z));
  useEffect(() => {
    targetPos.current.set(block.x, -block.y, block.z);
  }, [block.x, block.y, block.z]);

  // Reset entrance on new identity
  useEffect(() => {
    animState.current.enterTimer = 0;
    animState.current.scale = 0;
    animState.current.opacity = 0;
  }, [block.id, enterDelay]);

  const typeColors: Record<string, string> = {
    data: '#3b82f6',
    key: '#f59e0b',
    intermediate: '#8b5cf6',
    output: '#10b981',
    operation: '#ec4899',
    constant: '#6b7280',
  };
  const baseColor = block.color || typeColors[block.type] || '#6b7280';
  const targetOpacity = block.opacity ?? 1;

  useFrame((_, delta) => {
    const st = animState.current;
    const group = groupRef.current;
    const mat = materialRef.current;
    if (!group || !mat) return;

    // Smooth dim transition
    st.currentDim = THREE.MathUtils.lerp(st.currentDim, dimFactor, 4 * delta);

    // Entrance
    st.enterTimer += delta;
    const enterProgress = Math.max(0, Math.min(1, (st.enterTimer - enterDelay) / 0.4));
    const easedEnter = enterProgress < 1 ? 1 - Math.pow(1 - enterProgress, 3) : 1;

    // Position
    const ls = 6 * delta;
    st.posX = THREE.MathUtils.lerp(st.posX, targetPos.current.x, ls);
    st.posY = THREE.MathUtils.lerp(st.posY, targetPos.current.y, ls);
    st.posZ = THREE.MathUtils.lerp(st.posZ, targetPos.current.z, ls);
    group.position.set(st.posX, st.posY, st.posZ);

    // Scale: dim past steps slightly smaller
    const scaleTarget = easedEnter * (0.85 + 0.15 * st.currentDim);
    st.scale = THREE.MathUtils.lerp(st.scale, scaleTarget, 8 * delta);
    group.scale.setScalar(Math.max(0.001, st.scale));

    // Opacity: modulated by dim factor
    const baseOp = (hovered ? Math.min(targetOpacity + 0.1, 1) : targetOpacity * 0.9);
    const opTarget = baseOp * easedEnter * st.currentDim;
    st.opacity = THREE.MathUtils.lerp(st.opacity, opTarget, 8 * delta);
    mat.opacity = st.opacity;

    // Glow
    if (glowMatRef.current) {
      glowMatRef.current.opacity = highlighted ? st.opacity * 0.25 : 0;
    }

    // Emissive
    const tgtE = highlighted ? 0.4 : 0.05 * st.currentDim;
    st.emissive = THREE.MathUtils.lerp(st.emissive, tgtE, 5 * delta);
    mat.emissiveIntensity = st.emissive;

    // Subtle float for highlighted
    if (highlighted && animate) {
      group.position.z += Math.sin(Date.now() * 0.003) * 0.03;
    }

    if (hovered) {
      const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.015;
      group.scale.multiplyScalar(pulse);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <RoundedBox
          args={[block.width, block.height, 0.12]}
          radius={0.06}
          smoothness={4}
        >
          <meshStandardMaterial
            ref={materialRef}
            color={baseColor}
            transparent
            opacity={0}
            emissive={baseColor}
            emissiveIntensity={0}
            roughness={0.35}
            metalness={0.15}
            depthWrite={false}
          />
        </RoundedBox>
      </mesh>

      {/* Glow ring */}
      <mesh scale={[1.04, 1.06, 1]}>
        <RoundedBox
          args={[block.width, block.height, 0.02]}
          radius={0.06}
          smoothness={4}
        >
          <meshStandardMaterial
            ref={glowMatRef}
            color={baseColor}
            transparent
            opacity={0}
            emissive={baseColor}
            emissiveIntensity={0.6}
            depthWrite={false}
          />
        </RoundedBox>
      </mesh>

      <Html
        position={[0, 0, 0.1]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: hovered ? 'auto' : 'none',
          userSelect: 'none',
        }}
      >
        <div
          className="text-center px-3 py-1 rounded-md whitespace-nowrap"
          style={{
            maxWidth: `${block.width * 65}px`,
            fontSize: block.fontSize ? `${block.fontSize}px` : '10px',
            color: 'white',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            background: hovered ? 'rgba(0,0,0,0.5)' : 'transparent',
            borderRadius: '4px',
            transition: 'background 0.2s ease',
            opacity: dimFactor,
          }}
        >
          <div className="font-bold text-[9px] opacity-80 tracking-wide">{block.label}</div>
          <div className="font-mono text-[8px] opacity-90 truncate mt-0.5">{block.value}</div>
        </div>
      </Html>
    </group>
  );
}
