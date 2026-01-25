'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Music,
  Power,
  ChevronDown,
  ChevronUp,
  Waves,
  Drum,
  Piano,
  Activity,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { AudioState, SoundMode, ScaleType, LayerVolumes, SoundPackType, PatternType } from '@/types';
import { SOUND_PACK_LIST } from '@/lib/soundPacks';

interface AudioControlsProps {
  audioState: AudioState;
  isReady: boolean;
  ticksPerSecond?: number;
  currentSoundPack: SoundPackType;
  currentPattern: PatternType;
  harmonyDescription: string;
  onEnable: () => void;
  onDisable: () => void;
  onMasterVolumeChange: (volume: number) => void;
  onLayerVolumeChange: (layer: keyof LayerVolumes, volume: number) => void;
  onSoundModeChange: (mode: SoundMode) => void;
  onScaleChange: (scale: ScaleType) => void;
  onSoundPackChange: (pack: SoundPackType) => void;
  onMuteToggle: () => void;
}

const SOUND_MODES: { value: SoundMode; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Tick notes only' },
  { value: 'standard', label: 'Standard', description: 'Ticks + bass + percussion' },
  { value: 'full', label: 'Full', description: 'All layers active' },
  { value: 'ambient', label: 'Ambient', description: 'Emphasis on pads' },
];

const SCALES: { value: ScaleType; label: string }[] = [
  { value: 'pentatonic', label: 'Pentatonic' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'chromatic', label: 'Chromatic' },
];

const LAYER_CONFIG = [
  { key: 'tick' as const, label: 'Tick', icon: Piano, color: 'text-green-400' },
  { key: 'bass' as const, label: 'Bass', icon: Waves, color: 'text-blue-400' },
  { key: 'pad' as const, label: 'Pad', icon: Activity, color: 'text-purple-400' },
  { key: 'percussion' as const, label: 'Perc', icon: Drum, color: 'text-orange-400' },
];

const PATTERN_COLORS: Record<PatternType, string> = {
  strong_uptrend: 'text-green-400',
  strong_downtrend: 'text-red-400',
  high_volatility: 'text-yellow-400',
  consolidation: 'text-blue-400',
  reversal_up: 'text-emerald-400',
  reversal_down: 'text-rose-400',
  breakout_up: 'text-lime-400',
  breakout_down: 'text-pink-400',
  neutral: 'text-zinc-500',
};

const PATTERN_LABELS: Record<PatternType, string> = {
  strong_uptrend: 'Uptrend',
  strong_downtrend: 'Downtrend',
  high_volatility: 'Volatile',
  consolidation: 'Consolidating',
  reversal_up: 'Reversal Up',
  reversal_down: 'Reversal Down',
  breakout_up: 'Breakout Up',
  breakout_down: 'Breakout Down',
  neutral: 'Neutral',
};

export function AudioControls({
  audioState,
  isReady,
  ticksPerSecond = 0,
  currentSoundPack,
  currentPattern,
  harmonyDescription,
  onEnable,
  onDisable,
  onMasterVolumeChange,
  onLayerVolumeChange,
  onSoundModeChange,
  onScaleChange,
  onSoundPackChange,
  onMuteToggle,
}: AudioControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!audioState.enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <Button
          onClick={onEnable}
          size="lg"
          className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/30"
        >
          <Music className="w-5 h-5" />
          Enable Sound
        </Button>
        <p className="text-sm text-zinc-500 text-center max-w-xs">
          Click to enable melodic sonification. Every price tick creates sound!
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
            <Music className="w-5 h-5 text-green-400" />
          </motion.div>
          <span className="text-sm text-zinc-400">Audio Active</span>
          {ticksPerSecond > 0 && (
            <span className="text-xs text-zinc-600 ml-2">
              {ticksPerSecond} ticks/s
            </span>
          )}
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

      {/* AI Pattern Indicator */}
      {currentPattern !== 'neutral' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg"
        >
          <Sparkles className={`w-4 h-4 ${PATTERN_COLORS[currentPattern]}`} />
          <span className={`text-xs font-medium ${PATTERN_COLORS[currentPattern]}`}>
            {PATTERN_LABELS[currentPattern]}
          </span>
          {harmonyDescription && (
            <span className="text-xs text-zinc-500 ml-auto">
              {harmonyDescription}
            </span>
          )}
        </motion.div>
      )}

      {/* Master Volume */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          className={audioState.muted ? 'text-red-400' : 'text-zinc-400'}
        >
          {audioState.muted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <Slider
          value={[audioState.volume]}
          onValueChange={([value]) => onMasterVolumeChange(value)}
          max={1}
          step={0.01}
          disabled={audioState.muted}
          className="flex-1"
        />

        <span className="text-sm text-zinc-500 w-10 text-right">
          {Math.round(audioState.volume * 100)}%
        </span>
      </div>

      {/* Sound Pack Selector */}
      <div className="space-y-2">
        <span className="text-xs text-zinc-500">Sound Pack</span>
        <div className="flex flex-wrap gap-2">
          {SOUND_PACK_LIST.map((pack) => (
            <Button
              key={pack.value}
              variant={currentSoundPack === pack.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSoundPackChange(pack.value)}
              className={
                currentSoundPack === pack.value
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }
              title={pack.description}
            >
              {pack.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sound Mode Selector */}
      <div className="flex flex-wrap gap-2">
        {SOUND_MODES.map((mode) => (
          <Button
            key={mode.value}
            variant={audioState.soundMode === mode.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSoundModeChange(mode.value)}
            className={
              audioState.soundMode === mode.value
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }
            title={mode.description}
          >
            {mode.label}
          </Button>
        ))}
      </div>

      {/* Scale Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Scale:</span>
        <div className="flex gap-1">
          {SCALES.map((scale) => (
            <Button
              key={scale.value}
              variant="ghost"
              size="sm"
              onClick={() => onScaleChange(scale.value)}
              className={
                audioState.scale === scale.value
                  ? 'text-green-400 bg-green-900/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }
            >
              {scale.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-zinc-500 hover:text-zinc-300 justify-between"
      >
        <span>Layer Controls</span>
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {/* Layer Volume Controls */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              {LAYER_CONFIG.map((layer) => {
                const Icon = layer.icon;
                const value = audioState.layerVolumes[layer.key];

                return (
                  <div key={layer.key} className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${layer.color}`} />
                    <span className="text-xs text-zinc-500 w-10">{layer.label}</span>
                    <Slider
                      value={[value]}
                      onValueChange={([v]) => onLayerVolumeChange(layer.key, v)}
                      max={1}
                      step={0.01}
                      disabled={audioState.muted}
                      className="flex-1"
                    />
                    <span className="text-xs text-zinc-600 w-8 text-right">
                      {Math.round(value * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info text */}
      <div className="text-xs text-zinc-600 text-center space-y-1">
        <p>Every tick = sound | Up = bright | Down = dark</p>
        <p className="text-zinc-700">
          {audioState.scale === 'pentatonic' && 'Pentatonic scale - always pleasant'}
          {currentPattern !== 'neutral' && ' | AI harmonies active'}
        </p>
      </div>
    </motion.div>
  );
}
