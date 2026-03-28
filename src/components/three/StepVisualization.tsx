'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { VisualizationStep } from '@/lib/algorithms/types';
import DataBlockMesh from './DataBlockMesh';
import ConnectionLine from './ConnectionLine';
import OperationNode from './OperationNode';
import FlowConnector from './FlowConnector';
import * as THREE from 'three';

interface StepVisualizationProps {
  steps: VisualizationStep[];
  currentStepIndex: number;
  animate: boolean;
}

// Vertical spacing between steps in the pipeline
const STEP_Y_SPACING = 5;

export default function StepVisualization({ steps, currentStepIndex, animate }: StepVisualizationProps) {
  const gridRef = useRef<THREE.GridHelper>(null);

  // Compute how many steps to show: all up to and including currentStepIndex
  const visibleSteps = steps.slice(0, currentStepIndex + 1);

  // Grid extends to cover the full pipeline
  const gridHeight = Math.max(20, (currentStepIndex + 2) * STEP_Y_SPACING);

  useFrame((_, delta) => {
    if (gridRef.current && gridRef.current.material) {
      const mat = gridRef.current.material as THREE.LineBasicMaterial;
      if ('opacity' in mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.12, 2 * delta);
      }
    }
  });

  return (
    <group>
      {/* Extended grid that covers the pipeline */}
      <gridHelper
        ref={gridRef}
        args={[20, Math.max(20, gridHeight), '#222233', '#181825']}
        position={[5, -(currentStepIndex * STEP_Y_SPACING) / 2, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Render each visible step at its Y offset */}
      {visibleSteps.map((step, stepIdx) => {
        const yOffset = stepIdx * STEP_Y_SPACING;
        const isCurrent = stepIdx === currentStepIndex;
        const isPast = stepIdx < currentStepIndex;
        // Dim factor: current = 1.0, one step back = 0.45, two back = 0.25, etc.
        const dimFactor = isCurrent ? 1.0 : Math.max(0.15, 0.45 * Math.pow(0.6, currentStepIndex - stepIdx - 1));

        // Entrance delay: only for the current (latest) step; past steps are already in
        const baseDelay = isCurrent ? 0.05 : 0;

        return (
          <group key={`step-${stepIdx}-${step.id}`} position={[0, -yOffset, 0]}>
            {/* Step label marker */}
            <StepLabel
              text={`${step.phase}`}
              index={stepIdx}
              isCurrent={isCurrent}
              yOffset={yOffset}
            />

            {/* Data blocks */}
            {step.blocks.map((block, i) => (
              <DataBlockMesh
                key={`s${stepIdx}-b-${block.id}`}
                block={block}
                highlighted={isCurrent && step.highlights.includes(block.id)}
                animate={animate && isCurrent}
                enterDelay={baseDelay + i * 0.04}
                dimFactor={dimFactor}
              />
            ))}

            {/* Intra-step connections */}
            {step.connections.map((conn, i) => (
              <ConnectionLine
                key={`s${stepIdx}-c-${conn.from}-${conn.to}-${i}`}
                connection={conn}
                blocks={step.blocks}
                animate={animate && isCurrent}
                enterDelay={baseDelay + step.blocks.length * 0.03 + i * 0.05}
                dimFactor={dimFactor}
              />
            ))}

            {/* Operations */}
            {step.operations.map((op, i) => (
              <OperationNode
                key={`s${stepIdx}-o-${op.id}`}
                operation={op}
                animate={animate && isCurrent}
                enterDelay={baseDelay + step.blocks.length * 0.03 + i * 0.04}
                dimFactor={dimFactor}
              />
            ))}
          </group>
        );
      })}

      {/* Flow connectors between consecutive steps */}
      {visibleSteps.map((step, stepIdx) => {
        if (stepIdx === 0) return null;
        const prevStep = visibleSteps[stepIdx - 1];
        const yFrom = (stepIdx - 1) * STEP_Y_SPACING;
        const yTo = stepIdx * STEP_Y_SPACING;
        const isCurrent = stepIdx === currentStepIndex;

        return (
          <FlowConnector
            key={`flow-${stepIdx}`}
            prevStep={prevStep}
            nextStep={step}
            yFrom={yFrom}
            yTo={yTo}
            animate={animate && isCurrent}
            enterDelay={isCurrent ? 0 : 0}
          />
        );
      })}
    </group>
  );
}

// Small label on the left side showing the phase name
function StepLabel({ text, index, isCurrent, yOffset }: { text: string; index: number; isCurrent: boolean; yOffset: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const opacityTarget = isCurrent ? 1 : 0.35;
  const currentOpacity = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, opacityTarget, 4 * delta);
  });

  return (
    <group ref={groupRef} position={[-1.2, -0.5, 0]}>
      {/* Step number pip */}
      <mesh>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial
          color={isCurrent ? '#8b5cf6' : '#333344'}
          emissive={isCurrent ? '#8b5cf6' : '#000000'}
          emissiveIntensity={isCurrent ? 0.5 : 0}
          transparent
          opacity={isCurrent ? 0.9 : 0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Vertical line connecting step pips */}
      {index > 0 && (
        <mesh position={[0, STEP_Y_SPACING / 2, -0.05]}>
          <planeGeometry args={[0.02, STEP_Y_SPACING - 0.5]} />
          <meshStandardMaterial
            color="#333344"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
