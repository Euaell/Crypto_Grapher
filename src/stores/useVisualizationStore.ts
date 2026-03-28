import { create } from 'zustand';
import { VisualizationStep } from '@/lib/algorithms/types';

interface VisualizationState {
  // Playback
  steps: VisualizationStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // 0.5x, 1x, 2x, 4x

  // Camera
  zoom: number;

  // User input
  userInput: Record<string, string>;

  // Actions
  setSteps: (steps: VisualizationStep[]) => void;
  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setZoom: (zoom: number) => void;
  setUserInput: (input: Record<string, string>) => void;
  updateField: (key: string, value: string) => void;
  reset: () => void;
}

export const useVisualizationStore = create<VisualizationState>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  zoom: 1,
  userInput: {},

  setSteps: (steps) => set({ steps, currentStepIndex: 0, isPlaying: false }),

  goToStep: (index) => {
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index });
    }
  },

  nextStep: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setZoom: (zoom) => set({ zoom }),
  setUserInput: (userInput) => set({ userInput }),
  updateField: (key, value) => set((s) => ({ userInput: { ...s.userInput, [key]: value } })),
  reset: () => set({ steps: [], currentStepIndex: 0, isPlaying: false, userInput: {} }),
}));
