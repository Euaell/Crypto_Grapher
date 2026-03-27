'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { DataBlock } from '@/lib/algorithms/types';
import * as THREE from 'three';

interface DataBlockMeshProps {
  block: DataBlock;
  highlighted: boolean;
  animate: boolean;
}

export default function DataBlockMesh({ block, highlighted, animate }: DataBlockMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = highlighted ? 0.15 : 0;
    const current = meshRef.current.position.z;
    meshRef.current.position.z = THREE.MathUtils.lerp(current, target, delta * 5);

    if (highlighted && animate) {
      meshRef.current.rotation.y = Math.sin(Date.now() * 0.002) * 0.05;
    } else {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, delta * 5);
    }
  });

  const typeColors: Record<string, string> = {
    data: '#3b82f6',
    key: '#f59e0b',
    intermediate: '#8b5cf6',
    output: '#10b981',
    operation: '#ec4899',
    constant: '#6b7280',
  };

  const baseColor = block.color || typeColors[block.type] || '#6b7280';
  const opacity = block.opacity ?? 1;

  return (
    <group position={[block.x, -block.y, block.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <RoundedBox
          args={[block.width, block.height, 0.1]}
          radius={0.05}
          smoothness={4}
        >
          <meshStandardMaterial
            color={baseColor}
            transparent
            opacity={hovered ? Math.min(opacity + 0.1, 1) : opacity * 0.85}
            emissive={highlighted ? baseColor : '#000000'}
            emissiveIntensity={highlighted ? 0.3 : 0}
            roughness={0.4}
            metalness={0.1}
          />
        </RoundedBox>
      </mesh>

      <Html
        position={[0, 0, 0.08]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: hovered ? 'auto' : 'none',
          userSelect: 'none',
        }}
      >
        <div
          className="text-center px-2 py-0.5 rounded whitespace-nowrap"
          style={{
            maxWidth: `${block.width * 60}px`,
            fontSize: block.fontSize ? `${block.fontSize}px` : '10px',
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          <div className="font-bold text-[9px] opacity-80">{block.label}</div>
          <div className="font-mono text-[8px] opacity-90 truncate">{block.value}</div>
        </div>
      </Html>
    </group>
  );
}
