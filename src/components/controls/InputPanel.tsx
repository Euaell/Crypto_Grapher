'use client';

import { useState, useCallback } from 'react';
import { InputConfig } from '@/lib/algorithms/types';
import { useVisualizationStore } from '@/stores/useVisualizationStore';

interface InputPanelProps {
  config: InputConfig;
  onRun: (input: Record<string, string>) => void;
  algorithmColor: string;
}

export default function InputPanel({ config, onRun, algorithmColor }: InputPanelProps) {
  const { userInput, updateField, setUserInput } = useVisualizationStore();
  const [inputMode, setInputMode] = useState<'text' | 'hex' | 'base64' | 'file'>('text');

  // Initialize defaults
  const getFieldValue = useCallback((name: string, defaultValue?: string) => {
    return userInput[name] ?? defaultValue ?? '';
  }, [userInput]);

  const handleFileUpload = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      updateField(fieldName, text);
    };
    if (inputMode === 'hex' || inputMode === 'base64') {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleHexInput = (fieldName: string, hex: string) => {
    const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
    const text = cleaned.match(/.{1,2}/g)?.map(h => String.fromCharCode(parseInt(h, 16))).join('') || '';
    updateField(fieldName, text);
  };

  const handleBase64Input = (fieldName: string, b64: string) => {
    try {
      updateField(fieldName, atob(b64));
    } catch {
      updateField(fieldName, b64);
    }
  };

  const handleRunClick = () => {
    const input: Record<string, string> = {};
    config.fields.forEach((field) => {
      input[field.name] = getFieldValue(field.name, field.defaultValue);
    });
    onRun(input);
  };

  // Auto-populate defaults on first render
  const initDefaults = useCallback(() => {
    const defaults: Record<string, string> = {};
    config.fields.forEach((field) => {
      if (field.defaultValue && !userInput[field.name]) {
        defaults[field.name] = field.defaultValue;
      }
    });
    if (Object.keys(defaults).length > 0) {
      setUserInput({ ...userInput, ...defaults });
    }
  }, [config.fields, userInput, setUserInput]);

  // Call once
  useState(() => { initDefaults(); });

  return (
    <div className="bg-gray-900/95 backdrop-blur border border-gray-700/50 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-sm font-semibold">Input</h3>
        <div className="flex gap-1">
          {(['text', 'hex', 'base64', 'file'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                inputMode === mode
                  ? 'text-white'
                  : 'bg-gray-800 text-gray-500 hover:text-gray-300'
              }`}
              style={inputMode === mode ? { backgroundColor: algorithmColor } : undefined}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {config.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs text-gray-400 mb-1">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>

            {field.type === 'select' ? (
              <select
                value={getFieldValue(field.name, field.defaultValue)}
                onChange={(e) => updateField(field.name, e.target.value)}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={getFieldValue(field.name, field.defaultValue)}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors font-mono"
              />
            ) : inputMode === 'file' ? (
              <input
                type="file"
                onChange={(e) => handleFileUpload(field.name, e)}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors file:mr-2 file:bg-gray-700 file:text-gray-300 file:border-0 file:rounded file:px-2 file:py-1 file:text-xs"
              />
            ) : inputMode === 'hex' ? (
              <input
                type="text"
                value={getFieldValue(field.name, field.defaultValue).split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')}
                onChange={(e) => handleHexInput(field.name, e.target.value)}
                placeholder="Hex bytes (e.g., 48 65 6c 6c 6f)"
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors font-mono"
              />
            ) : inputMode === 'base64' ? (
              <input
                type="text"
                value={typeof window !== 'undefined' ? btoa(getFieldValue(field.name, field.defaultValue)) : ''}
                onChange={(e) => handleBase64Input(field.name, e.target.value)}
                placeholder="Base64 encoded input"
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors font-mono"
              />
            ) : (
              <input
                type="text"
                value={getFieldValue(field.name, field.defaultValue)}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors font-mono"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleRunClick}
        className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98] shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${algorithmColor}, ${algorithmColor}cc)`,
          boxShadow: `0 4px 14px ${algorithmColor}40`,
        }}
      >
        Run Algorithm
      </button>
    </div>
  );
}
