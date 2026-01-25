'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VisualizationMode } from '@/types';

interface AudioVisualizerProps {
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  getWaveformData: () => Float32Array | null;
  getFrequencyData: () => Float32Array | null;
  isReady: boolean;
  trendDirection?: 'up' | 'down' | 'neutral';
}

const CANVAS_HEIGHT = 100;
const BAR_COUNT = 32;

export function AudioVisualizer({
  mode,
  onModeChange,
  getWaveformData,
  getFrequencyData,
  isReady,
  trendDirection = 'neutral',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Get colors based on trend direction
  const getColors = useCallback(() => {
    switch (trendDirection) {
      case 'up':
        return {
          primary: '#22c55e',    // Green
          secondary: '#16a34a',  // Darker green
          glow: 'rgba(34, 197, 94, 0.3)',
        };
      case 'down':
        return {
          primary: '#ef4444',    // Red
          secondary: '#dc2626',  // Darker red
          glow: 'rgba(239, 68, 68, 0.3)',
        };
      default:
        return {
          primary: '#a855f7',    // Purple
          secondary: '#9333ea',  // Darker purple
          glow: 'rgba(168, 85, 247, 0.3)',
        };
    }
  }, [trendDirection]);

  // Draw waveform visualization
  const drawWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    width: number,
    height: number
  ) => {
    const colors = getColors();

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.clearRect(0, 0, width, height);

    // Draw glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.glow;

    // Draw waveform
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.primary;

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const y = (v + 1) / 2 * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Draw center line
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [getColors]);

  // Draw frequency bars visualization
  const drawFrequencyBars = useCallback((
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    width: number,
    height: number
  ) => {
    const colors = getColors();

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate bar dimensions
    const barWidth = width / BAR_COUNT - 2;
    const gap = 2;

    // Process data - group into fewer bars
    const step = Math.floor(data.length / BAR_COUNT);

    for (let i = 0; i < BAR_COUNT; i++) {
      // Average values in this range
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const index = i * step + j;
        if (index < data.length) {
          // FFT data is in dB, normalize to 0-1
          const value = data[index];
          const normalized = (value + 100) / 100; // Assuming -100dB to 0dB range
          sum += Math.max(0, Math.min(1, normalized));
        }
      }
      const average = sum / step;

      // Calculate bar height
      const barHeight = average * height * 0.9;
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, colors.secondary);
      gradient.addColorStop(1, colors.primary);

      // Draw glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = colors.glow;

      // Draw bar with rounded top
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [getColors]);

  // Animation loop using useEffect
  useEffect(() => {
    if (mode === 'off' || !isReady) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      if (mode === 'waveform') {
        const data = getWaveformData();
        if (data) {
          drawWaveform(ctx, data, width, height);
        }
      } else if (mode === 'frequency') {
        const data = getFrequencyData();
        if (data) {
          drawFrequencyBars(ctx, data, width, height);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [mode, isReady, getWaveformData, getFrequencyData, drawWaveform, drawFrequencyBars]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        canvas.width = width;
        canvas.height = CANVAS_HEIGHT;
      }
    });

    const parent = canvas.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="w-full">
      {/* Mode selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Visualizer</span>
          {mode !== 'off' && (
            <span className="text-xs text-zinc-600">
              ({mode === 'waveform' ? 'Waveform' : 'Frequency'})
            </span>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onModeChange('off')}
            className={mode === 'off' ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600'}
            title="Off"
          >
            <Power className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onModeChange('waveform')}
            className={mode === 'waveform' ? 'text-green-400 bg-zinc-800' : 'text-zinc-600'}
            title="Waveform"
          >
            <Activity className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onModeChange('frequency')}
            className={mode === 'frequency' ? 'text-purple-400 bg-zinc-800' : 'text-zinc-600'}
            title="Frequency"
          >
            <BarChart3 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: mode === 'off' ? 0 : 1,
          height: mode === 'off' ? 0 : CANVAS_HEIGHT,
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden rounded-lg bg-zinc-900/50"
      >
        <canvas
          ref={canvasRef}
          height={CANVAS_HEIGHT}
          className="w-full"
          style={{ display: mode === 'off' ? 'none' : 'block' }}
        />
      </motion.div>

      {/* Tap to cycle hint */}
      {mode !== 'off' && !isReady && (
        <p className="text-xs text-zinc-600 text-center mt-2">
          Enable audio to see visualization
        </p>
      )}
    </div>
  );
}
