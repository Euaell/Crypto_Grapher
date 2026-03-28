'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Connection, DataBlock } from '@/lib/algorithms/types';
import * as THREE from 'three';

interface ConnectionLineProps {
  connection: Connection;
  blocks: DataBlock[];
  animate: boolean;
  enterDelay: number;
  dimFactor?: number;
}

export default function ConnectionLine({ connection, blocks, animate, enterDelay, dimFactor = 1 }: ConnectionLineProps) {
  const dotRef = useRef<THREE.Mesh>(null);
  const dotMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const arrowRef = useRef<THREE.Mesh>(null);
  const tubeMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const arrowMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const progressRef = useRef(0);
  const drawProgress = useRef(0);
  const enterTimer = useRef(0);
  const currentDim = useRef(dimFactor);

  const fromBlock = blocks.find(b => b.id === connection.from);
  const toBlock = blocks.find(b => b.id === connection.to);

  useEffect(() => {
    enterTimer.current = 0;
    drawProgress.current = 0;
  }, [connection.from, connection.to, enterDelay]);

  const curveData = useMemo(() => {
    if (!fromBlock || !toBlock) return null;
    const start = new THREE.Vector3(fromBlock.x, -fromBlock.y, fromBlock.z);
    const end = new THREE.Vector3(toBlock.x, -toBlock.y, toBlock.z);
    const dist = start.distanceTo(end);
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2 - Math.min(dist * 0.15, 0.4),
      (start.z + end.z) / 2 + 0.2
    );
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tangent = curve.getTangent(1).normalize();
    const arrowAngle = Math.atan2(tangent.y, tangent.x);
    return { curve, start, end, tangent, arrowAngle };
  }, [fromBlock, toBlock]);

  const tubeGeometry = useMemo(() => {
    if (!curveData) return null;
    return new THREE.TubeGeometry(curveData.curve, 30, 0.015, 6, false);
  }, [curveData]);

  useFrame((_, delta) => {
    if (!curveData) return;

    currentDim.current = THREE.MathUtils.lerp(currentDim.current, dimFactor, 4 * delta);
    const dim = currentDim.current;

    // Enter
    enterTimer.current += delta;
    const enterProgress = Math.max(0, Math.min(1, (enterTimer.current - enterDelay) / 0.6));
    const easedDraw = enterProgress < 1 ? 1 - Math.pow(1 - enterProgress, 2) : 1;
    drawProgress.current = THREE.MathUtils.lerp(drawProgress.current, easedDraw, 6 * delta);

    if (tubeMaterialRef.current) {
      tubeMaterialRef.current.opacity = (connection.dashed ? 0.3 : 0.5) * drawProgress.current * dim;
    }

    if (arrowRef.current && arrowMaterialRef.current) {
      const arrowScale = drawProgress.current > 0.8 ? (drawProgress.current - 0.8) / 0.2 : 0;
      arrowRef.current.scale.setScalar(Math.max(0.001, arrowScale));
      arrowMaterialRef.current.opacity = 0.7 * arrowScale * dim;
    }

    // Traveling dot only on current (bright) steps
    if (connection.animated && animate && dotRef.current && drawProgress.current > 0.5 && dim > 0.5) {
      progressRef.current = (progressRef.current + delta * 1.2) % 1;
      const t = progressRef.current * drawProgress.current;
      const point = curveData.curve.getPoint(t);
      dotRef.current.position.copy(point);
      dotRef.current.scale.setScalar(1);
      if (dotMaterialRef.current) {
        dotMaterialRef.current.emissiveIntensity = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
        dotMaterialRef.current.opacity = drawProgress.current * dim;
      }
    } else if (dotRef.current) {
      dotRef.current.scale.setScalar(0.001);
    }
  });

  if (!curveData || !fromBlock || !toBlock || !tubeGeometry) return null;
  const color = connection.color || '#ffffff';

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          ref={tubeMaterialRef}
          color={color}
          transparent
          opacity={0}
          emissive={color}
          emissiveIntensity={0.2}
          depthWrite={false}
        />
      </mesh>

      {connection.animated && (
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            ref={dotMaterialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      )}

      <group
        position={[curveData.end.x, curveData.end.y, curveData.end.z]}
        rotation={[0, 0, curveData.arrowAngle]}
      >
        <mesh ref={arrowRef} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.05, 0.14, 8]} />
          <meshStandardMaterial
            ref={arrowMaterialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
