'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Operation } from '@/lib/algorithms/types';
import * as THREE from 'three';

interface OperationNodeProps {
  operation: Operation;
  animate: boolean;
}

const operationSymbols: Record<string, string> = {
  xor: '⊕',
  sbox: 'S',
  permutation: 'π',
  shift: '≫',
  mix: 'M',
  add: '+',
  multiply: '×',
  modexp: '^',
  hash: '#',
  pad: '▮',
  expand: '↗',
  compress: '↘',
  rotate: '↻',
  substitute: 'σ',
};

export default function OperationNode({ operation, animate }: OperationNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (animate) {
      meshRef.current.rotation.z += delta * 0.5;
    } else {
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, delta * 3);
    }
  });

  return (
    <group position={[operation.x, -operation.y, operation.z]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color={operation.color}
          emissive={operation.color}
          emissiveIntensity={animate ? 0.4 : 0.1}
          transparent
          opacity={0.8}
          wireframe={false}
        />
      </mesh>

      <Html position={[0, -0.4, 0]} center distanceFactor={8}>
        <div className="text-center whitespace-nowrap" style={{ fontSize: '8px', color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          <span className="font-bold">{operationSymbols[operation.type] || '?'}</span>
          <span className="ml-1 opacity-75">{operation.label}</span>
        </div>
      </Html>
    </group>
  );
}
