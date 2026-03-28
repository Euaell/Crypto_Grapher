'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense, ReactNode } from 'react';

interface Scene3DProps {
  children: ReactNode;
  zoom?: number;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4444ff" wireframe />
    </mesh>
  );
}

export default function Scene3D({ children, zoom = 1 }: Scene3DProps) {
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
        <PerspectiveCamera
          makeDefault
          position={[5, 1, 14 / zoom]}
          fov={45}
          near={0.1}
          far={100}
        />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.6}
          minDistance={3}
          maxDistance={50}
          target={[4.5, -1, 0]}
          maxPolarAngle={Math.PI * 0.85}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 8, 5]} intensity={0.7} />
        <directionalLight position={[-4, 4, -3]} intensity={0.2} color="#8b5cf6" />
        <pointLight position={[0, -3, 4]} intensity={0.3} color="#3b82f6" distance={20} />

        {/* Subtle fog for depth */}
        <fog attach="fog" args={['#0a0a0f', 25, 50]} />

        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
