'use client';

import { useEffect, useRef } from 'react';
import { useVisualizationStore } from '@/stores/useVisualizationStore';

export default function PlaybackControls() {
  const {
    steps, currentStepIndex, isPlaying, playbackSpeed,
    nextStep, prevStep, togglePlay, goToStep, setSpeed, pause,
  } = useVisualizationStore();

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        nextStep();
      }, 2000 / playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, nextStep]);

  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="bg-gray-900/95 backdrop-blur border border-gray-700/50 rounded-xl p-4 space-y-3">
      {/* Step info */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-400">Step </span>
          <span className="text-white font-bold">{currentStepIndex + 1}</span>
          <span className="text-gray-400"> of {steps.length}</span>
        </div>
        {currentStep && (
          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
            {currentStep.phase}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          goToStep(Math.floor(x * steps.length));
        }}
      >
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        {/* Step markers */}
        {steps.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-0.5"
            style={{
              left: `${((i + 0.5) / steps.length) * 100}%`,
              backgroundColor: i <= currentStepIndex ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Go to start */}
          <button
            onClick={() => goToStep(0)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Go to start"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Previous */}
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous step"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full transition-all shadow-lg shadow-blue-500/20"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextStep}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next step"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
            </svg>
          </button>

          {/* Go to end */}
          <button
            onClick={() => goToStep(steps.length - 1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Go to end"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
            </svg>
          </button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Speed:</span>
          {[0.5, 1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeed(speed)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Step description */}
      {currentStep && (
        <div className="text-sm space-y-1">
          <h4 className="text-white font-semibold">{currentStep.label}</h4>
          <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-line">
            {currentStep.description}
          </p>
        </div>
      )}
    </div>
  );
}
