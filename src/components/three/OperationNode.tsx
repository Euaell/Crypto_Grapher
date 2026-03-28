'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Operation } from '@/lib/algorithms/types';
import * as THREE from 'three';

interface OperationNodeProps {
  operation: Operation;
  animate: boolean;
  enterDelay: number;
  exiting?: boolean;
  onExitComplete?: () => void;
}

const operationSymbols: Record<string, string> = {
  xor: '\u2295',
  sbox: 'S',
  permutation: '\u03C0',
  shift: '\u226B',
  mix: 'M',
  add: '+',
  multiply: '\u00D7',
  modexp: '^',
  hash: '#',
  pad: '\u25AE',
  expand: '\u2197',
  compress: '\u2198',
  rotate: '\u21BB',
  substitute: '\u03C3',
};

export default function OperationNode({ operation, animate, enterDelay, exiting, onExitComplete }: OperationNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const animState = useRef({
    scale: 0,
    opacity: 0,
    enterTimer: 0,
    exitTimer: 0,
    rotation: 0,
    posX: operation.x,
    posY: -operation.y,
    posZ: operation.z,
    didNotifyExit: false,
  });

  const targetPos = useRef(new THREE.Vector3(operation.x, -operation.y, operation.z));
  useEffect(() => {
    targetPos.current.set(operation.x, -operation.y, operation.z);
  }, [operation.x, operation.y, operation.z]);

  useEffect(() => {
    animState.current.enterTimer = 0;
    animState.current.scale = 0;
    animState.current.opacity = 0;
    animState.current.exitTimer = 0;
    animState.current.didNotifyExit = false;
  }, [operation.id, enterDelay]);

  useEffect(() => {
    if (exiting) {
      animState.current.exitTimer = 0;
      animState.current.didNotifyExit = false;
    }
  }, [exiting]);

  useFrame((_, delta) => {
    const st = animState.current;
    const group = groupRef.current;
    const mat = materialRef.current;
    if (!group || !mat) return;

    // Exit
    if (exiting) {
      st.exitTimer += delta;
      st.scale = THREE.MathUtils.lerp(st.scale, 0, 8 * delta);
      st.opacity = THREE.MathUtils.lerp(st.opacity, 0, 8 * delta);
      group.scale.setScalar(Math.max(0.001, st.scale));
      mat.opacity = st.opacity;
      if (ringMatRef.current) ringMatRef.current.opacity = 0;
      if (st.exitTimer > 0.3 && !st.didNotifyExit) {
        st.didNotifyExit = true;
        onExitComplete?.();
      }
      return;
    }

    // Enter
    st.enterTimer += delta;
    const enterProgress = Math.max(0, Math.min(1, (st.enterTimer - enterDelay) / 0.5));
    const eased = 1 - Math.pow(1 - enterProgress, 3);

    const ls = 6 * delta;
    st.posX = THREE.MathUtils.lerp(st.posX, targetPos.current.x, ls);
    st.posY = THREE.MathUtils.lerp(st.posY, targetPos.current.y, ls);
    st.posZ = THREE.MathUtils.lerp(st.posZ, targetPos.current.z, ls);
    group.position.set(st.posX, st.posY, st.posZ);

    st.scale = THREE.MathUtils.lerp(st.scale, eased, 8 * delta);
    group.scale.setScalar(Math.max(0.001, st.scale));

    st.opacity = THREE.MathUtils.lerp(st.opacity, 0.85 * eased, 8 * delta);
    mat.opacity = st.opacity;

    if (animate) st.rotation += delta * 0.6;
    if (meshRef.current) {
      meshRef.current.rotation.y = st.rotation;
      meshRef.current.rotation.z = Math.sin(st.rotation * 0.7) * 0.15;
    }

    if (ringRef.current && ringMatRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.1;
      ringRef.current.scale.setScalar(pulse);
      ringMatRef.current.opacity = st.opacity * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.22, 1]} />
        <meshStandardMaterial
          ref={materialRef}
          color={operation.color}
          emissive={operation.color}
          emissiveIntensity={animate ? 0.5 : 0.2}
          transparent
          opacity={0}
          roughness={0.3}
          metalness={0.2}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.01, 8, 32]} />
        <meshStandardMaterial
          ref={ringMatRef}
          color={operation.color}
          emissive={operation.color}
          emissiveIntensity={0.5}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <Html position={[0, -0.5, 0]} center distanceFactor={8}>
        <div
          className="text-center whitespace-nowrap px-2 py-0.5 rounded"
          style={{
            fontSize: '9px',
            color: 'white',
            textShadow: '0 1px 4px rgba(0,0,0,0.95)',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
          }}
        >
          <span className="font-bold text-[10px]">{operationSymbols[operation.type] || '?'}</span>
          <span className="ml-1 opacity-80">{operation.label}</span>
        </div>
      </Html>
    </group>
  );
}
