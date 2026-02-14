'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Bell, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioControlsProps {
  enabled: boolean;
  volume: number;
  muted: boolean;
  isReady: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  getVwapInfo?: () => { vwap: number; deviation: number } | null;
}

export function AudioControls({
  enabled,
  volume,
  muted,
  isReady,
  onEnable,
  onDisable,
  onVolumeChange,
  onMuteToggle,
  getVwapInfo,
}: AudioControlsProps) {
  const [vwapInfo, setVwapInfo] = useState<{ vwap: number; deviation: number } | null>(null);

  // Poll VWAP info when enabled
  useEffect(() => {
    if (!enabled || !getVwapInfo) return;

    const interval = setInterval(() => {
      const info = getVwapInfo();
      setVwapInfo(info);
    }, 200);

    return () => clearInterval(interval);
  }, [enabled, getVwapInfo]);

  if (!enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <Button
          onClick={onEnable}
          size="lg"
          className="gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg shadow-amber-900/30"
        >
          <Bell className="w-5 h-5" />
          Enable Sound
        </Button>
        <p className="text-sm text-zinc-500 text-center max-w-xs">
          Bell pitch follows price deviation from VWAP. Above VWAP = higher pitch. Below = lower.
        </p>
      </motion.div>
    );
  }

  // Get color based on deviation
  const getDeviationColor = () => {
    if (!vwapInfo) return 'text-zinc-500';
    const dev = vwapInfo.deviation;
    if (dev > 0.5) return 'text-green-400';
    if (dev > 0.2) return 'text-green-500';
    if (dev < -0.5) return 'text-red-400';
    if (dev < -0.2) return 'text-red-500';
    return 'text-zinc-400';
  };

  // Get pitch indicator
  const getPitchIndicator = () => {
    if (!vwapInfo) return 'Calculating...';
    const dev = vwapInfo.deviation;
    const clampedDev = Math.max(-1, Math.min(1, dev));
    const percent = (clampedDev * 100).toFixed(1);

    if (dev > 0.7) return `High pitch (+${percent}%)`;
    if (dev > 0.3) return `Rising (+${percent}%)`;
    if (dev < -0.7) return `Low pitch (${percent}%)`;
    if (dev < -0.3) return `Falling (${percent}%)`;
    return `Neutral (${dev >= 0 ? '+' : ''}${percent}%)`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4 w-full"
    >
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              scale: isReady ? [1, 1.1, 1] : 1,
            }}
            transition={{
              repeat: isReady ? Infinity : 0,
              repeatDelay: 2,
              duration: 0.5,
            }}
          >
            <Bell className="w-5 h-5 text-amber-400" />
          </motion.div>
          <span className="text-sm text-zinc-400">Bell Audio Active</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDisable}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <Power className="w-4 h-4" />
        </Button>
      </div>

      {/* VWAP Deviation Indicator */}
      {vwapInfo && (
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 rounded-lg">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500">VWAP</span>
            <span className="text-sm font-mono text-zinc-300">
              ${vwapInfo.vwap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-zinc-500">Pitch</span>
            <span className={`text-sm font-medium ${getDeviationColor()}`}>
              {getPitchIndicator()}
            </span>
          </div>
        </div>
      )}

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          className={muted ? 'text-red-400' : 'text-zinc-400'}
        >
          {muted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <Slider
          value={[volume]}
          onValueChange={([value]) => onVolumeChange(value)}
          max={1}
          step={0.01}
          disabled={muted}
          className="flex-1"
        />

        <span className="text-sm text-zinc-500 w-10 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Info text */}
      <div className="text-xs text-zinc-600 text-center">
        <p>Pitch varies continuously based on deviation from 1-min VWAP</p>
      </div>
    </motion.div>
  );
}
