'use client';

import { VisualizationStep } from '@/lib/algorithms/types';
import DataBlockMesh from './DataBlockMesh';
import ConnectionLine from './ConnectionLine';
import OperationNode from './OperationNode';

interface StepVisualizationProps {
  step: VisualizationStep;
  animate: boolean;
}

export default function StepVisualization({ step, animate }: StepVisualizationProps) {
  return (
    <group>
      {/* Grid floor */}
      <gridHelper
        args={[20, 20, '#333333', '#222222']}
        position={[5, -4, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Data blocks */}
      {step.blocks.map((block) => (
        <DataBlockMesh
          key={block.id}
          block={block}
          highlighted={step.highlights.includes(block.id)}
          animate={animate}
        />
      ))}

      {/* Connections */}
      {step.connections.map((conn, idx) => (
        <ConnectionLine
          key={`${conn.from}-${conn.to}-${idx}`}
          connection={conn}
          blocks={step.blocks}
          animate={animate}
        />
      ))}

      {/* Operations */}
      {step.operations.map((op) => (
        <OperationNode
          key={op.id}
          operation={op}
          animate={animate}
        />
      ))}
    </group>
  );
}
