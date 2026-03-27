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
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera
          makeDefault
          position={[5, 3, 12 / zoom]}
          fov={50}
        />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={50}
          target={[5, 1, 0]}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <pointLight position={[-5, 5, 5]} intensity={0.4} color="#8b5cf6" />
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
