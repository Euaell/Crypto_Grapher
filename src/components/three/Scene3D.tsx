'use client';

import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, ReactNode, useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Scene3DProps {
  children: ReactNode;
  zoom?: number;
  followY?: number; // Y position to smoothly follow (for pipeline scrolling)
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4444ff" wireframe />
    </mesh>
  );
}

// Camera that smoothly follows a target Y position
function CameraFollower({ followY }: { followY: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null);
  const currentY = useRef(0);

  useFrame((state, delta) => {
    // Smoothly track the pipeline position
    const targetY = -followY;
    currentY.current = THREE.MathUtils.lerp(currentY.current, targetY, 2.5 * delta);

    camera.position.y = currentY.current + 2;

    // Update orbit controls target
    const controls = (state as unknown as { controls?: { target: THREE.Vector3 } }).controls;
    if (controls && controls.target) {
      controls.target.y = THREE.MathUtils.lerp(controls.target.y, currentY.current - 0.5, 3 * delta);
    }
  });

  return null;
}

export default function Scene3D({ children, zoom = 1, followY = 0 }: Scene3DProps) {
  return (
    <div className="w-full h-full" style={{ minHeight: '500px' }}>
      <Canvas
        style={{ background: 'transparent' }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 1.5]}
        frameloop="always"
      >
        <perspectiveCamera
          position={[5, 2, 14 / zoom]}
          fov={45}
          near={0.1}
          far={200}
        />

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.6}
          minDistance={3}
          maxDistance={80}
          target={[4.5, 0, 0]}
          maxPolarAngle={Math.PI * 0.85}
        />

        <CameraFollower followY={followY} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 8, 5]} intensity={0.7} />
        <directionalLight position={[-4, 4, -3]} intensity={0.2} color="#8b5cf6" />
        <pointLight position={[0, -3, 4]} intensity={0.3} color="#3b82f6" distance={30} />

        <fog attach="fog" args={['#0a0a0f', 30, 65]} />

        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
