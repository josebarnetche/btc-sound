'use client';

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
}: AudioControlsProps) {
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
          Click to enable bell sounds. Price up = winning bell. Price down = deep bell.
        </p>
      </motion.div>
    );
  }

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
      <div className="text-xs text-zinc-600 text-center space-y-1">
        <p>Price UP = Winning bell | Price DOWN = Deep bell | Stable = Neutral bell</p>
      </div>
    </motion.div>
  );
}
