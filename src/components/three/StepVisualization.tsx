'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { VisualizationStep, DataBlock, Connection, Operation } from '@/lib/algorithms/types';
import DataBlockMesh from './DataBlockMesh';
import ConnectionLine from './ConnectionLine';
import OperationNode from './OperationNode';
import * as THREE from 'three';

interface StepVisualizationProps {
  step: VisualizationStep | null;
  animate: boolean;
}

// Transition state machine: we keep a "displayed" step that transitions smoothly
// from the previous step. Elements fade out, then fade in to the new step.

interface TransitionState {
  blocks: (DataBlock & { enterDelay: number })[];
  connections: (Connection & { enterDelay: number })[];
  operations: (Operation & { enterDelay: number })[];
  highlights: string[];
  transitionId: string;
}

function buildTransitionState(step: VisualizationStep | null): TransitionState {
  if (!step) {
    return { blocks: [], connections: [], operations: [], highlights: [], transitionId: 'empty' };
  }

  // Stagger blocks: 0.05s between each
  const blocks = step.blocks.map((b, i) => ({
    ...b,
    enterDelay: 0.08 + i * 0.06,
  }));

  // Connections start after blocks are mostly in
  const connBaseDelay = 0.08 + step.blocks.length * 0.04;
  const connections = step.connections.map((c, i) => ({
    ...c,
    enterDelay: connBaseDelay + i * 0.08,
  }));

  // Operations come in with connections
  const operations = step.operations.map((o, i) => ({
    ...o,
    enterDelay: connBaseDelay + i * 0.06,
  }));

  return {
    blocks,
    connections,
    operations,
    highlights: step.highlights,
    transitionId: step.id,
  };
}

export default function StepVisualization({ step, animate }: StepVisualizationProps) {
  const [displayState, setDisplayState] = useState<TransitionState>(
    () => buildTransitionState(step)
  );
  const prevStepId = useRef<string | null>(null);

  // When step changes, build new transition state
  useEffect(() => {
    if (!step) {
      setDisplayState(buildTransitionState(null));
      prevStepId.current = null;
      return;
    }

    if (step.id !== prevStepId.current) {
      prevStepId.current = step.id;
      setDisplayState(buildTransitionState(step));
    }
  }, [step]);

  // Grid that stays stable
  const gridRef = useRef<THREE.GridHelper>(null);
  useFrame((_, delta) => {
    // Subtle grid pulse when animating
    if (gridRef.current && gridRef.current.material) {
      const mat = gridRef.current.material as THREE.Material;
      if ('opacity' in mat) {
        (mat as THREE.LineBasicMaterial).opacity = THREE.MathUtils.lerp(
          (mat as THREE.LineBasicMaterial).opacity,
          animate ? 0.25 : 0.15,
          2 * delta
        );
      }
    }
  });

  return (
    <group>
      {/* Stable grid floor */}
      <gridHelper
        ref={gridRef}
        args={[20, 20, '#333333', '#1a1a2e']}
        position={[5, -4, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Data blocks with staggered entrance */}
      {displayState.blocks.map((block) => (
        <DataBlockMesh
          key={`${displayState.transitionId}-${block.id}`}
          block={block}
          highlighted={displayState.highlights.includes(block.id)}
          animate={animate}
          enterDelay={block.enterDelay}
        />
      ))}

      {/* Connections with progressive draw */}
      {displayState.connections.map((conn, idx) => (
        <ConnectionLine
          key={`${displayState.transitionId}-conn-${conn.from}-${conn.to}-${idx}`}
          connection={conn}
          blocks={displayState.blocks}
          animate={animate}
          enterDelay={conn.enterDelay}
        />
      ))}

      {/* Operations with entrance */}
      {displayState.operations.map((op) => (
        <OperationNode
          key={`${displayState.transitionId}-op-${op.id}`}
          operation={op}
          animate={animate}
          enterDelay={op.enterDelay}
        />
      ))}
    </group>
  );
}
