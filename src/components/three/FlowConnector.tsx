'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { VisualizationStep } from '@/lib/algorithms/types';
import * as THREE from 'three';

interface FlowConnectorProps {
  prevStep: VisualizationStep;
  nextStep: VisualizationStep;
  yFrom: number; // Y offset of previous step
  yTo: number;   // Y offset of current step
  animate: boolean;
  enterDelay: number;
}

export default function FlowConnector({ prevStep, nextStep, yFrom, yTo, animate, enterDelay }: FlowConnectorProps) {
  const tubeMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const dotMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const drawProgress = useRef(0);
  const enterTimer = useRef(0);
  const dotProgress = useRef(0);

  useEffect(() => {
    enterTimer.current = 0;
    drawProgress.current = 0;
  }, [prevStep.id, nextStep.id]);

  // Find the "output" blocks from prev step and "input" blocks of next step
  // Use the last output/intermediate block of prev, and first data block of next
  const { curve, tubeGeometry } = useMemo(() => {
    // Find a representative output point from prev step
    const outputBlocks = prevStep.blocks.filter(b =>
      b.type === 'output' || b.type === 'intermediate'
    );
    const sourceBlock = outputBlocks.length > 0
      ? outputBlocks[outputBlocks.length - 1]
      : prevStep.blocks[prevStep.blocks.length - 1];

    // Find a representative input point for next step
    const inputBlocks = nextStep.blocks.filter(b =>
      b.type === 'data' || b.type === 'key'
    );
    const targetBlock = inputBlocks.length > 0
      ? inputBlocks[0]
      : nextStep.blocks[0];

    if (!sourceBlock || !targetBlock) return { curve: null, tubeGeometry: null };

    const start = new THREE.Vector3(
      sourceBlock.x,
      -sourceBlock.y - yFrom,
      sourceBlock.z
    );
    const end = new THREE.Vector3(
      targetBlock.x,
      -targetBlock.y - yTo,
      targetBlock.z
    );

    // Smooth S-curve between steps
    const midY = (start.y + end.y) / 2;
    const cp1 = new THREE.Vector3(start.x, midY + (start.y - midY) * 0.3, 0.3);
    const cp2 = new THREE.Vector3(end.x, midY + (end.y - midY) * 0.3, 0.3);

    const c = new THREE.CubicBezierCurve3(start, cp1, cp2, end);
    const geo = new THREE.TubeGeometry(c, 40, 0.02, 6, false);

    return { curve: c, tubeGeometry: geo };
  }, [prevStep, nextStep, yFrom, yTo]);

  useFrame((_, delta) => {
    if (!curve) return;

    enterTimer.current += delta;
    const enterProgress = Math.max(0, Math.min(1, (enterTimer.current - enterDelay) / 0.8));
    const eased = 1 - Math.pow(1 - enterProgress, 2);
    drawProgress.current = THREE.MathUtils.lerp(drawProgress.current, eased, 5 * delta);

    if (tubeMaterialRef.current) {
      tubeMaterialRef.current.opacity = 0.4 * drawProgress.current;
    }

    // Flowing dot
    if (animate && dotRef.current && dotMatRef.current && drawProgress.current > 0.3) {
      dotProgress.current = (dotProgress.current + delta * 0.6) % 1;
      const point = curve.getPoint(dotProgress.current);
      dotRef.current.position.copy(point);
      dotRef.current.scale.setScalar(1);
      dotMatRef.current.opacity = 0.9 * drawProgress.current;
      dotMatRef.current.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.006) * 0.4;
    } else if (dotRef.current) {
      dotRef.current.scale.setScalar(0.001);
    }
  });

  if (!curve || !tubeGeometry) return null;

  return (
    <group>
      {/* Flow tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          ref={tubeMaterialRef}
          color="#8b5cf6"
          transparent
          opacity={0}
          emissive="#8b5cf6"
          emissiveIntensity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Traveling pulse dot */}
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          ref={dotMatRef}
          color="#a78bfa"
          emissive="#a78bfa"
          emissiveIntensity={0.8}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
