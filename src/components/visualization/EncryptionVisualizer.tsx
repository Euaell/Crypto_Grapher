"use client";

import React, { useEffect, useRef, useState } from 'react';
import { EncryptionAlgorithm } from '@/lib/crypto/encryption-service';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

interface EncryptionVisualizerProps {
  algorithm: EncryptionAlgorithm;
  input: string;
  output: string;
  isEncrypting: boolean;
  isAnimating: boolean;
  progress: number;
}

export function EncryptionVisualizer({
  algorithm,
  input,
  output,
  isEncrypting,
  isAnimating,
  progress
}: EncryptionVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);
  const [showDetailView, setShowDetailView] = useState<boolean>(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<EncryptionAlgorithm | null>(null);

  // Dynamically import the AlgorithmDetailView to avoid SSR issues with Three.js
  const AlgorithmDetailView = dynamic(
    () => import('./AlgorithmDetailView'),
    { ssr: false, loading: () => <div className="w-full h-[600px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div> }
  );

  // Calculate entropy of a string
  const calculateEntropy = (text: string): number => {
    const len = text.length;
    const frequencies: Record<string, number> = {};
    
    // Calculate frequency of each character
    for (let i = 0; i < len; i++) {
      const char = text.charAt(i);
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
    
    // Calculate entropy
    return Object.values(frequencies).reduce((entropy, freq) => {
      const p = freq / len;
      return entropy - (p * Math.log2(p));
    }, 0);
  };

  // Convert string to color
  const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };

  // Draw algorithm-specific visualization
  useEffect(() => {
    if (!canvasRef.current || (!input && !output)) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Helper for calculating dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Cancel any existing animation
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }
    
    const renderFrame = () => {
      // Choose visualization based on algorithm
      switch (algorithm) {
        case EncryptionAlgorithm.AES:
          drawBlockCipherVisualization(ctx, width, height);
          break;
        case EncryptionAlgorithm.DES:
        case EncryptionAlgorithm.TripleDES:
          drawBlockCipherVisualization(ctx, width, height);
          break;
        case EncryptionAlgorithm.Rabbit:
        case EncryptionAlgorithm.RC4:
          drawStreamCipherVisualization(ctx, width, height);
          break;
        case EncryptionAlgorithm.OTP:
          drawOTPVisualization(ctx, width, height);
          break;
        default:
          drawGenericVisualization(ctx, width, height);
      }
      
      if (isAnimating) {
        setAnimationFrame(requestAnimationFrame(renderFrame));
      }
    };
    
    renderFrame();
    
    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [algorithm, input, output, isAnimating, progress, animationFrame]);

  // Block cipher visualization (AES, DES, 3DES)
  const drawBlockCipherVisualization = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Draw grid of blocks
    const blockSize = 20;
    const gridWidth = Math.floor(width / blockSize);
    const gridHeight = Math.floor(height / blockSize);
    
    // Use progress to determine how many blocks to "encrypt"
    const totalBlocks = gridWidth * gridHeight;
    const encryptedBlocks = Math.floor((progress / 100) * totalBlocks);
    
    let blockCount = 0;
    
    // Calculate input and output entropy for color mapping
    const inputEntropy = calculateEntropy(input);
    const outputEntropy = output ? calculateEntropy(output) : 0;
    
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const isEncrypted = blockCount < encryptedBlocks;
        
        // Map position to character in input/output
        const inputIdx = (y * gridWidth + x) % Math.max(1, input.length);
        const outputIdx = (y * gridWidth + x) % Math.max(1, output.length || 1);
        
        // Get characters and convert to colors
        const inputChar = input[inputIdx] || '';
        const outputChar = output[outputIdx] || '';
        
        const inputColor = stringToColor(inputChar);
        const outputColor = stringToColor(outputChar);
        
        // Draw block
        ctx.fillStyle = isEncrypted ? outputColor : inputColor;
        ctx.fillRect(x * blockSize, y * blockSize, blockSize - 2, blockSize - 2);
        
        // Add "mixing" effect for blocks in transition
        if (blockCount === encryptedBlocks && isAnimating) {
          ctx.fillStyle = isEncrypting ? outputColor : inputColor;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x * blockSize, y * blockSize, blockSize - 2, blockSize - 2);
          ctx.globalAlpha = 1.0;
        }
        
        blockCount++;
      }
    }
    
    // Draw algorithm name
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(algorithm, 20, 30);
    
    // Draw entropy values
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`Input Entropy: ${inputEntropy.toFixed(2)}`, 20, height - 40);
    if (output) {
      ctx.fillText(`Output Entropy: ${outputEntropy.toFixed(2)}`, 20, height - 20);
    }
  };

  // Stream cipher visualization (RC4, Rabbit)
  const drawStreamCipherVisualization = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Create a stream effect
    const streamHeight = 4;
    const numStreams = Math.floor(height / (streamHeight * 2));
    
    // Use progress to determine how much of each stream to "encrypt"
    
    for (let i = 0; i < numStreams; i++) {
      const y = i * streamHeight * 2;
      
      // Calculate the length of this stream
      const streamProgress = (i / numStreams) * 100;
      const adjustedProgress = (progress + streamProgress) % 100;
      const streamLength = (adjustedProgress / 100) * width;
      
      // Draw original part
      ctx.fillStyle = '#3498db'; // Blue for original
      ctx.fillRect(0, y, width - streamLength, streamHeight);
      
      // Draw encrypted part
      ctx.fillStyle = '#e74c3c'; // Red for encrypted
      ctx.fillRect(width - streamLength, y, streamLength, streamHeight);
    }
    
    // Draw XOR operation visualization
    const xorSize = 100;
    const xorX = (width - xorSize) / 2;
    const xorY = (height - xorSize) / 2;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xorX, xorY);
    ctx.lineTo(xorX + xorSize, xorY + xorSize);
    ctx.moveTo(xorX, xorY + xorSize);
    ctx.lineTo(xorX + xorSize, xorY);
    ctx.stroke();
    
    // Draw algorithm name
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(algorithm, 20, 30);
  };

  // One-time pad visualization
  const drawOTPVisualization = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const charHeight = 30;
    const charWidth = 20;
    
    // Draw up to 20 characters of the input
    const displayInput = input.substring(0, 20);
    const displayOutput = output ? output.substring(0, 20) : '';
    
    // Use progress to determine how many characters to "encrypt"
    const encryptedChars = Math.floor((progress / 100) * displayInput.length);
    
    // Draw input text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('Input:', 20, 40);
    
    // Draw each character with animation
    for (let i = 0; i < displayInput.length; i++) {
      const char = displayInput[i];
      const x = 100 + i * charWidth;
      
      // Draw character box
      if (i < encryptedChars) {
        ctx.fillStyle = '#72b5fc'; // Encrypted color
      } else {
        ctx.fillStyle = '#2c3e50'; // Original color
      }
      
      ctx.fillRect(x - 2, 30 - 2, charWidth, charHeight);
      
      // Draw character
      ctx.fillStyle = '#ffffff';
      ctx.fillText(char, x, 50);
    }
    
    // Draw output text if available
    if (displayOutput) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      ctx.fillText('Output:', 20, 100);
      
      // Draw each character
      for (let i = 0; i < Math.min(encryptedChars, displayOutput.length); i++) {
        const char = displayOutput[i];
        const x = 100 + i * charWidth;
        
        // Draw character box
        ctx.fillStyle = '#72b5fc'; // Encrypted color
        ctx.fillRect(x - 2, 90 - 2, charWidth, charHeight);
        
        // Draw character
        ctx.fillStyle = '#ffffff';
        ctx.fillText(char, x, 110);
      }
    }
    
    // Draw XOR operation in the middle
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('XOR', 20, 70);
    
    // Draw algorithm name
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(algorithm, 20, height - 20);
  };

  // Generic visualization for other algorithms
  const drawGenericVisualization = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Create a gradient for background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#4ca1af');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw progress bar
    const barWidth = width - 40;
    const barHeight = 20;
    const barX = 20;
    const barY = height / 2 - barHeight / 2;
    
    // Background
    ctx.fillStyle = '#34495e';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress
    ctx.fillStyle = '#3498db';
    ctx.fillRect(barX, barY, barWidth * (progress / 100), barHeight);
    
    // Draw algorithm name
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(algorithm, 20, 30);
    
    // Draw progress text
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`${Math.round(progress)}%`, width / 2, barY + barHeight + 20);
  };

  // Add this function to handle drill-down navigation
  const handleDrillDown = (algorithm: EncryptionAlgorithm) => {
    setSelectedAlgorithm(algorithm);
    setShowDetailView(true);
  };

  // Add this function to handle going back from the detail view
  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedAlgorithm(null);
  };

  // Modify the return statement to conditionally render the detail view
  if (showDetailView && selectedAlgorithm) {
    return (
      <div className="w-full py-4">
        <AlgorithmDetailView 
          algorithm={selectedAlgorithm} 
          onBack={handleBackFromDetail} 
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={256}
          className="w-full h-full"
        />
      </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2" 
          onClick={() => handleDrillDown(algorithm)}
        >
          View Details
        </Button>
    </div>
  );
} 