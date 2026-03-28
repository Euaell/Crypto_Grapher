'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
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

// A "layer" is a snapshot of one step's elements, either entering or exiting
interface Layer {
  id: string; // unique layer id
  stepId: string;
  blocks: DataBlock[];
  connections: Connection[];
  operations: Operation[];
  highlights: string[];
  exiting: boolean;
}

let layerCounter = 0;

export default function StepVisualization({ step, animate }: StepVisualizationProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const prevStepId = useRef<string | null>(null);
  const exitCounters = useRef<Map<string, number>>(new Map());

  // When step changes, mark old layers as exiting and add new layer
  useEffect(() => {
    const newStepId = step?.id ?? null;
    if (newStepId === prevStepId.current) return;
    prevStepId.current = newStepId;

    setLayers(prev => {
      // Mark all existing layers as exiting
      const updated = prev.map(l => l.exiting ? l : { ...l, exiting: true });

      // Add new layer if we have a step
      if (step) {
        const layerId = `layer-${++layerCounter}`;
        // Count total elements for exit tracking
        const totalElements = step.blocks.length + step.connections.length + step.operations.length;
        exitCounters.current.set(layerId, 0);

        updated.push({
          id: layerId,
          stepId: step.id,
          blocks: step.blocks,
          connections: step.connections,
          operations: step.operations,
          highlights: step.highlights,
          exiting: false,
        });
      }

      return updated;
    });
  }, [step]);

  // Remove a layer when all its elements have finished exiting
  const handleElementExitComplete = useCallback((layerId: string, totalElements: number) => {
    const count = (exitCounters.current.get(layerId) ?? 0) + 1;
    exitCounters.current.set(layerId, count);

    if (count >= totalElements) {
      exitCounters.current.delete(layerId);
      setLayers(prev => prev.filter(l => l.id !== layerId));
    }
  }, []);

  // Safety: force-remove exiting layers after a timeout to prevent stuck layers
  useEffect(() => {
    const interval = setInterval(() => {
      setLayers(prev => {
        // Keep all non-exiting layers, and exiting layers less than 2 entries old
        // (simple cleanup - in practice the exit callbacks handle this)
        return prev.filter(l => !l.exiting || Date.now() < 0); // keep all, timeout handled by callbacks
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Failsafe: auto-remove exiting layers after 1 second
  const exitTimestamps = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    layers.forEach(l => {
      if (l.exiting && !exitTimestamps.current.has(l.id)) {
        exitTimestamps.current.set(l.id, Date.now());
      }
    });
    // Clean up timestamps for removed layers
    exitTimestamps.current.forEach((_, id) => {
      if (!layers.find(l => l.id === id)) {
        exitTimestamps.current.delete(id);
      }
    });
  }, [layers]);

  // Timer to force-remove stuck exiting layers
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let shouldUpdate = false;
      exitTimestamps.current.forEach((timestamp, id) => {
        if (now - timestamp > 800) {
          shouldUpdate = true;
        }
      });
      if (shouldUpdate) {
        setLayers(prev => prev.filter(l => {
          if (!l.exiting) return true;
          const ts = exitTimestamps.current.get(l.id);
          if (ts && Date.now() - ts > 800) {
            exitTimestamps.current.delete(l.id);
            exitCounters.current.delete(l.id);
            return false;
          }
          return true;
        }));
      }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // Compute stagger delays
  const getBlockDelay = (index: number, total: number) => 0.05 + index * 0.05;
  const getConnDelay = (index: number, blockCount: number) => 0.05 + blockCount * 0.03 + index * 0.06;
  const getOpDelay = (index: number, blockCount: number) => 0.05 + blockCount * 0.03 + index * 0.05;

  // Grid
  const gridRef = useRef<THREE.GridHelper>(null);
  useFrame((_, delta) => {
    if (gridRef.current && gridRef.current.material) {
      const mat = gridRef.current.material as THREE.LineBasicMaterial;
      if ('opacity' in mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, animate ? 0.25 : 0.15, 2 * delta);
      }
    }
  });

  return (
    <group>
      <gridHelper
        ref={gridRef}
        args={[20, 20, '#333333', '#1a1a2e']}
        position={[5, -4, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {layers.map((layer) => {
        const totalElements = layer.blocks.length + layer.connections.length + layer.operations.length;

        return (
          <group key={layer.id}>
            {/* Blocks */}
            {layer.blocks.map((block, i) => (
              <DataBlockMesh
                key={`${layer.id}-b-${block.id}`}
                block={block}
                highlighted={!layer.exiting && layer.highlights.includes(block.id)}
                animate={animate && !layer.exiting}
                enterDelay={layer.exiting ? 0 : getBlockDelay(i, layer.blocks.length)}
                exiting={layer.exiting}
                onExitComplete={() => handleElementExitComplete(layer.id, totalElements)}
              />
            ))}

            {/* Connections */}
            {layer.connections.map((conn, i) => (
              <ConnectionLine
                key={`${layer.id}-c-${conn.from}-${conn.to}-${i}`}
                connection={conn}
                blocks={layer.blocks}
                animate={animate && !layer.exiting}
                enterDelay={layer.exiting ? 0 : getConnDelay(i, layer.blocks.length)}
                exiting={layer.exiting}
                onExitComplete={() => handleElementExitComplete(layer.id, totalElements)}
              />
            ))}

            {/* Operations */}
            {layer.operations.map((op, i) => (
              <OperationNode
                key={`${layer.id}-o-${op.id}`}
                operation={op}
                animate={animate && !layer.exiting}
                enterDelay={layer.exiting ? 0 : getOpDelay(i, layer.blocks.length)}
                exiting={layer.exiting}
                onExitComplete={() => handleElementExitComplete(layer.id, totalElements)}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}
