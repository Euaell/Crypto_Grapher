'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Connection, DataBlock } from '@/lib/algorithms/types';
import * as THREE from 'three';

interface ConnectionLineProps {
  connection: Connection;
  blocks: DataBlock[];
  animate: boolean;
}

export default function ConnectionLine({ connection, blocks, animate }: ConnectionLineProps) {
  const lineRef = useRef<THREE.Line>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  const fromBlock = blocks.find(b => b.id === connection.from);
  const toBlock = blocks.find(b => b.id === connection.to);

  const points = useMemo(() => {
    if (!fromBlock || !toBlock) return null;
    const start = new THREE.Vector3(fromBlock.x, -fromBlock.y, fromBlock.z);
    const end = new THREE.Vector3(toBlock.x, -toBlock.y, toBlock.z);
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2 - 0.3,
      (start.z + end.z) / 2 + 0.15
    );

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(30);
  }, [fromBlock, toBlock]);

  useFrame((_, delta) => {
    if (animate && connection.animated && dotRef.current && points) {
      progressRef.current = (progressRef.current + delta * 0.8) % 1;
      const idx = Math.floor(progressRef.current * (points.length - 1));
      const point = points[idx];
      if (point) {
        dotRef.current.position.copy(point);
      }
    }
  });

  if (!points || !fromBlock || !toBlock) return null;

  const color = connection.color || '#ffffff';
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <line ref={lineRef as unknown as React.RefObject<THREE.Line>} geometry={geometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={connection.dashed ? 0.4 : 0.6}
          linewidth={1}
        />
      </line>

      {connection.animated && animate && (
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}

      {/* Arrow head */}
      <mesh position={[toBlock.x, -toBlock.y, toBlock.z]} rotation={[0, 0, Math.atan2(-(toBlock.y - fromBlock.y), toBlock.x - fromBlock.x)]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
