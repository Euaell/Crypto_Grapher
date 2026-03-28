'use client';

import { useEffect, useState, useCallback, use } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { loadEngine, getAlgorithmById } from '@/lib/algorithms/registry';
import { AlgorithmEngine } from '@/lib/algorithms/types';
import { useVisualizationStore } from '@/stores/useVisualizationStore';
import PlaybackControls from '@/components/controls/PlaybackControls';
import InputPanel from '@/components/controls/InputPanel';

export const runtime = 'edge';

// Dynamic import for Three.js (no SSR)
const Scene3D = dynamic(() => import('@/components/three/Scene3D'), { ssr: false });
const StepVisualization = dynamic(() => import('@/components/three/StepVisualization'), { ssr: false });

interface PageProps {
  params: Promise<{ algorithm: string }>;
}

export default function VisualizePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const algorithmId = resolvedParams.algorithm;
  const [engine, setEngine] = useState<AlgorithmEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { steps, currentStepIndex, isPlaying, setSteps, zoom, userInput } = useVisualizationStore();
  const catalogEntry = getAlgorithmById(algorithmId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadEngine(algorithmId).then((eng) => {
      if (cancelled) return;
      setEngine(eng);
      setLoading(false);
      if (eng) {
        // Auto-run with defaults
        const defaults: Record<string, string> = {};
        eng.inputConfig.fields.forEach((f) => {
          if (f.defaultValue) defaults[f.name] = f.defaultValue;
        });
        const generatedSteps = eng.generateSteps(defaults);
        setSteps(generatedSteps);
      }
    });
    return () => { cancelled = true; };
  }, [algorithmId, setSteps]);

  const handleRun = useCallback((input: Record<string, string>) => {
    if (!engine) return;
    const generatedSteps = engine.generateSteps(input);
    setSteps(generatedSteps);
  }, [engine, setSteps]);

  const currentStep = steps[currentStepIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading {catalogEntry?.name || algorithmId}...</p>
        </div>
      </div>
    );
  }

  if (!engine || !catalogEntry) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">Algorithm not found: {algorithmId}</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">Back to catalog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl z-40 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-2xl">{catalogEntry.icon}</span>
            <div>
              <h1 className="text-base font-bold" style={{ color: catalogEntry.color }}>
                {catalogEntry.name}
              </h1>
              <p className="text-[10px] text-gray-500">
                {catalogEntry.category.replace('-', ' ')} | {catalogEntry.yearIntroduced} | {catalogEntry.authors}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Step phases navigation */}
        {steps.length > 0 && (
          <div className="px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-none">
            {steps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => useVisualizationStore.getState().goToStep(i)}
                className={`flex-shrink-0 px-2 py-1 text-[10px] rounded-md transition-all ${
                  i === currentStepIndex
                    ? 'text-white font-medium'
                    : i < currentStepIndex
                    ? 'bg-gray-800/50 text-gray-500'
                    : 'bg-gray-900/50 text-gray-600 hover:text-gray-400'
                }`}
                style={i === currentStepIndex ? {
                  backgroundColor: `${catalogEntry.color}30`,
                  color: catalogEntry.color,
                } : undefined}
              >
                {step.phase}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Visualization */}
        <div className="flex-1 relative">
          <Scene3D zoom={zoom} followY={currentStepIndex * 5}>
            <StepVisualization
              steps={steps}
              currentStepIndex={currentStepIndex}
              animate={isPlaying}
            />
          </Scene3D>

          {/* Overlay controls */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[480px]">
            <PlaybackControls />
          </div>

          {/* Zoom indicator */}
          <div className="absolute top-4 right-4 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
            Scroll to zoom | Drag to rotate | Right-drag to pan
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-l border-gray-800/50 bg-gray-950/50 overflow-y-auto"
            >
              <div className="w-[320px] p-4 space-y-4">
                {/* Algorithm info */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">About</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{catalogEntry.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-800/50 rounded-lg p-2">
                      <span className="text-gray-500">Key Size</span>
                      <div className="text-white font-mono">{typeof catalogEntry.keySize === 'number' ? `${catalogEntry.keySize}-bit` : catalogEntry.keySize}</div>
                    </div>
                    {catalogEntry.blockSize && (
                      <div className="bg-gray-800/50 rounded-lg p-2">
                        <span className="text-gray-500">Block Size</span>
                        <div className="text-white font-mono">{catalogEntry.blockSize}-bit</div>
                      </div>
                    )}
                    <div className="bg-gray-800/50 rounded-lg p-2">
                      <span className="text-gray-500">Status</span>
                      <div className="text-white capitalize">{catalogEntry.status}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2">
                      <span className="text-gray-500">Year</span>
                      <div className="text-white">{catalogEntry.yearIntroduced}</div>
                    </div>
                  </div>
                </div>

                {/* Input panel */}
                <InputPanel
                  config={engine.inputConfig}
                  onRun={handleRun}
                  algorithmColor={catalogEntry.color}
                />

                {/* Step list */}
                {steps.length > 0 && (
                  <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Steps ({steps.length})</h3>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {steps.map((step, i) => (
                        <button
                          key={step.id}
                          onClick={() => useVisualizationStore.getState().goToStep(i)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                            i === currentStepIndex
                              ? 'text-white'
                              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                          }`}
                          style={i === currentStepIndex ? {
                            backgroundColor: `${catalogEntry.color}20`,
                            color: catalogEntry.color,
                          } : undefined}
                        >
                          <span className="font-mono opacity-50 mr-2">{(i + 1).toString().padStart(2, '0')}</span>
                          {step.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
