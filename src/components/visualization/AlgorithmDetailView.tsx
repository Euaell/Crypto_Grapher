"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import { motion } from 'framer-motion';
import { EncryptionAlgorithm } from '@/lib/crypto/encryption-service';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as THREE from 'three';

// Types for visualization data
interface AlgorithmStep {
  id: string;
  name: string;
  description: string;
  input: string;
  output: string;
  position: [number, number, number];
  color?: string;
}

interface AlgorithmConnection {
  from: string;
  to: string;
  label?: string;
}

interface AlgorithmVisualizationData {
  algorithm: EncryptionAlgorithm;
  steps: AlgorithmStep[];
  connections: AlgorithmConnection[];
  introduction: string;
  conclusion: string;
}

// Component for a single node in the visualization
const AlgorithmNode: React.FC<{
  step: AlgorithmStep;
  isActive: boolean;
  onClick: () => void;
}> = ({ step, isActive, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  return (
    <group position={step.position}>
      <mesh 
        ref={meshRef}
        onClick={onClick}
        scale={isActive ? 1.2 : 1}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={step.color || (isActive ? "#4f46e5" : "#6366f1")} 
          wireframe={false}
          emissive={isActive ? "#4338ca" : "#0000"}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </mesh>
      
      <Html distanceFactor={10}>
        <div className="bg-black/80 text-white p-2 rounded-md text-sm whitespace-nowrap">
          {step.name}
        </div>
      </Html>
    </group>
  );
};

// Component for connections between nodes
const Connection: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
}> = ({ from, to, color = "#94a3b8" }) => {
  const points = [
    new THREE.Vector3(...from),
    new THREE.Vector3(...to)
  ];
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={color} linewidth={1} />
    </line>
  );
};

// Main Component
const AlgorithmDetailView: React.FC<{
  algorithm: EncryptionAlgorithm;
  onBack: () => void;
}> = ({ algorithm, onBack }) => {
  const [data, setData] = useState<AlgorithmVisualizationData | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  
  // Generate visualization data based on the algorithm
  useEffect(() => {
    // This would be replaced with actual algorithm-specific data
    const algorithmData = getAlgorithmData(algorithm);
    setData(algorithmData);
    setLoading(false);
    
    // Set the first step as active
    if (algorithmData.steps.length > 0) {
      setActiveStep(algorithmData.steps[0].id);
    }
  }, [algorithm]);
  
  // Auto-play animation
  useEffect(() => {
    if (!autoPlay || !data) return;
    
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        const newProgress = prev + 0.5;
        if (newProgress >= 100) {
          setAutoPlay(false);
          return 100;
        }
        return newProgress;
      });
      
      // Update active step based on progress
      const stepIndex = Math.floor((animationProgress / 100) * data.steps.length);
      if (data.steps[stepIndex]) {
        setActiveStep(data.steps[stepIndex].id);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [autoPlay, data, animationProgress]);
  
  // Get the active step details
  const activeStepDetails = data?.steps.find(step => step.id === activeStep);
  
  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-bold">Visualization Not Available</h3>
          <p className="text-muted-foreground">The requested algorithm visualization is not available.</p>
          <Button onClick={onBack} className="mt-4">Back to Overview</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{algorithm} Algorithm in Detail</h2>
          <p className="text-muted-foreground">{data.introduction}</p>
        </div>
        <Button onClick={onBack} variant="outline">Back to Overview</Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: Controls and step info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Steps</CardTitle>
              <CardDescription>Navigate through each step of the algorithm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.steps.map(step => (
                  <Button
                    key={step.id}
                    variant={activeStep === step.id ? "default" : "outline"}
                    className="w-full justify-start text-left"
                    onClick={() => setActiveStep(step.id)}
                  >
                    {step.name}
                  </Button>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <div className="space-x-2 w-full">
                <Button 
                  className="w-full"
                  onClick={() => {
                    setAnimationProgress(0);
                    setAutoPlay(true);
                    setActiveStep(data.steps[0].id);
                  }}
                  disabled={autoPlay}
                >
                  {autoPlay ? "Playing..." : "Play Animation"}
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {activeStepDetails && (
            <Card>
              <CardHeader>
                <CardTitle>{activeStepDetails.name}</CardTitle>
                <Badge variant="outline" className="w-fit">Step {data.steps.findIndex(s => s.id === activeStep) + 1} of {data.steps.length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{activeStepDetails.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Input</h4>
                      <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-24">
                        {activeStepDetails.input}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Output</h4>
                      <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-24">
                        {activeStepDetails.output}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right side: 3D visualization */}
        <div className="lg:col-span-2">
          <Card className="w-full h-[600px] overflow-hidden">
            <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              
              {/* Show all steps */}
              {data.steps.map(step => (
                <AlgorithmNode 
                  key={step.id}
                  step={step}
                  isActive={step.id === activeStep}
                  onClick={() => setActiveStep(step.id)}
                />
              ))}
              
              {/* Show connections between steps */}
              {data.connections.map((connection, index) => {
                const fromStep = data.steps.find(s => s.id === connection.from);
                const toStep = data.steps.find(s => s.id === connection.to);
                
                if (!fromStep || !toStep) return null;
                
                return (
                  <Connection 
                    key={`${connection.from}-${connection.to}`}
                    from={fromStep.position}
                    to={toStep.position}
                    color={
                      fromStep.id === activeStep || toStep.id === activeStep 
                        ? "#4f46e5" 
                        : "#94a3b8"
                    }
                  />
                );
              })}
              
              <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                minDistance={5}
                maxDistance={20}
              />
              <Environment preset="city" />
            </Canvas>
          </Card>
          
          {/* Progress bar for animation */}
          <div className="mt-4">
            <div className="w-full bg-muted rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${animationProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Algorithm Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{data.conclusion}</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to generate algorithm-specific visualization data
function getAlgorithmData(algorithm: EncryptionAlgorithm): AlgorithmVisualizationData {
  // This is a placeholder - in a real implementation, you would have specific data for each algorithm
  
  switch (algorithm) {
    case EncryptionAlgorithm.AES:
      return {
        algorithm: EncryptionAlgorithm.AES,
        introduction: "AES (Advanced Encryption Standard) is a symmetric block cipher chosen by the US government to protect classified information. It's implemented in software and hardware throughout the world to encrypt sensitive data.",
        steps: [
          {
            id: "key-expansion",
            name: "Key Expansion",
            description: "The AES key expansion algorithm takes a user-supplied key and derives from it a number of separate round keys which are later used in the encryption process.",
            input: "User-supplied encryption key (128, 192, or 256 bits)",
            output: "Set of round keys for each round of encryption",
            position: [-4, 0, 0],
            color: "#60a5fa"
          },
          {
            id: "init-round",
            name: "Initial Round",
            description: "The first round is a simple XOR operation between the plaintext and the initial round key (derived from the key expansion).",
            input: "Plaintext Block (128 bits)",
            output: "Initial State Matrix",
            position: [-2, 0, 0],
            color: "#3b82f6"
          },
          {
            id: "sub-bytes",
            name: "SubBytes",
            description: "Each byte in the state matrix is replaced with a corresponding byte from the S-box lookup table, which provides non-linearity to the cipher.",
            input: "State Matrix",
            output: "Substituted State Matrix",
            position: [0, 0, 0],
            color: "#2563eb"
          },
          {
            id: "shift-rows",
            name: "ShiftRows",
            description: "The rows of the state matrix are cyclically shifted left by different offsets (0, 1, 2, 3) to provide diffusion.",
            input: "Substituted State Matrix",
            output: "Shifted State Matrix",
            position: [2, 0, 0],
            color: "#1d4ed8"
          },
          {
            id: "mix-columns",
            name: "MixColumns",
            description: "Each column of the state matrix is transformed using a linear transformation to ensure thorough mixing of the data.",
            input: "Shifted State Matrix",
            output: "Mixed State Matrix",
            position: [0, 2, 0],
            color: "#1e40af"
          },
          {
            id: "add-round-key",
            name: "AddRoundKey",
            description: "Each byte of the state is combined with a round key using bitwise XOR, incorporating the key into the encryption process.",
            input: "Mixed State Matrix + Round Key",
            output: "New State Matrix",
            position: [2, 2, 0],
            color: "#1e3a8a"
          },
          {
            id: "final-round",
            name: "Final Round",
            description: "The final round is slightly different, omitting the MixColumns step to make decryption more straightforward.",
            input: "State Matrix from previous round",
            output: "Encrypted Ciphertext (128 bits)",
            position: [4, 0, 0],
            color: "#172554"
          }
        ],
        connections: [
          { from: "key-expansion", to: "init-round" },
          { from: "init-round", to: "sub-bytes" },
          { from: "sub-bytes", to: "shift-rows" },
          { from: "shift-rows", to: "mix-columns" },
          { from: "mix-columns", to: "add-round-key" },
          { from: "add-round-key", to: "sub-bytes" }, // Loop back for multiple rounds
          { from: "add-round-key", to: "final-round" }, // Final path
          { from: "key-expansion", to: "add-round-key" }, // Key flow
          { from: "key-expansion", to: "final-round" }, // Key flow to final round
        ],
        conclusion: "AES processes data in blocks of 128 bits, using key lengths of 128, 192, or 256 bits. The algorithm consists of multiple rounds of transformations including SubBytes, ShiftRows, MixColumns, and AddRoundKey. The number of rounds depends on the key size: 10 rounds for 128-bit keys, 12 rounds for 192-bit keys, and 14 rounds for 256-bit keys. This combination of operations provides strong security against various cryptographic attacks."
      };
      
    case EncryptionAlgorithm.OTP:
      return {
        algorithm: EncryptionAlgorithm.OTP,
        introduction: "One-Time Pad (OTP) is a simple yet powerful encryption technique that can provide perfect secrecy when used correctly. It requires a random key that is at least as long as the message and used only once.",
        steps: [
          {
            id: "key-generation",
            name: "Key Generation",
            description: "Generate a truly random key that is at least as long as the message to be encrypted. This key must never be reused.",
            input: "Required message length",
            output: "Random key of equal or greater length",
            position: [-3, 0, 0],
            color: "#4ade80"
          },
          {
            id: "char-conversion",
            name: "Character Conversion",
            description: "Convert both the plaintext message and the key to a numeric representation, typically binary or ASCII values.",
            input: "Plaintext message and random key",
            output: "Numeric representation of message and key",
            position: [0, 0, 0],
            color: "#22c55e"
          },
          {
            id: "xor-operation",
            name: "XOR Operation",
            description: "Perform an XOR (exclusive OR) operation between each character of the plaintext and the corresponding character in the key.",
            input: "Numeric representation of message and key",
            output: "XOR result (ciphertext in numeric form)",
            position: [3, 0, 0],
            color: "#16a34a"
          },
          {
            id: "output-conversion",
            name: "Output Conversion",
            description: "Convert the numeric result back to the desired output format (binary, text, Base64, etc.).",
            input: "XOR result in numeric form",
            output: "Final ciphertext in desired format",
            position: [0, 2, 0],
            color: "#15803d"
          }
        ],
        connections: [
          { from: "key-generation", to: "char-conversion" },
          { from: "char-conversion", to: "xor-operation" },
          { from: "xor-operation", to: "output-conversion" }
        ],
        conclusion: "The One-Time Pad is theoretically unbreakable when implemented correctly. The key requirements for perfect secrecy are: (1) the key must be truly random, (2) the key must be at least as long as the message, (3) the key must never be reused, and (4) the key must be kept completely secret. When these conditions are met, OTP provides information-theoretic security, meaning it cannot be broken even with unlimited computing resources."
      };
      
    // Add other algorithms as needed
    
    default:
      // Generic placeholder data
      return {
        algorithm,
        introduction: `${algorithm} is a cryptographic algorithm used for data encryption.`,
        steps: [
          {
            id: "step1",
            name: "Step 1",
            description: "First step in the encryption process",
            input: "Input data",
            output: "Intermediate result",
            position: [-2, 0, 0]
          },
          {
            id: "step2",
            name: "Step 2",
            description: "Second step in the encryption process",
            input: "Intermediate result from Step 1",
            output: "Final encrypted output",
            position: [2, 0, 0]
          }
        ],
        connections: [
          { from: "step1", to: "step2" }
        ],
        conclusion: `${algorithm} encryption process takes your original data through multiple transformations to produce secure encrypted output.`
      };
  }
}

export default AlgorithmDetailView; 