'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { PriceDisplay } from '@/components/PriceDisplay';
import { PriceChart } from '@/components/PriceChart';
import { AudioControls } from '@/components/AudioControls';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';
import { useMelodicEngine } from '@/hooks/useMelodicEngine';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { analyzePriceChangeImmediate } from '@/lib/priceAnalysis';
import type { PriceChange } from '@/types';

export default function Home() {
  const { price, connectionState } = useBinanceWebSocket();
  const {
    audioState,
    isReady,
    ticksPerSecond,
    currentSoundPack,
    currentPattern,
    harmonyDescription,
    enableAudio,
    disableAudio,
    setMasterVolume,
    setLayerVolume,
    setSoundMode,
    setScale,
    setSoundPack,
    toggleMute,
    playTick,
    getWaveformData,
    getFrequencyData,
    visualizerMode,
    setVisualizerMode,
  } = useMelodicEngine();
  const { history, addPrice } = usePriceHistory();

  // Track last price for change calculation
  const lastPriceRef = useRef<number | null>(null);

  // State for values that are rendered
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
  const [trendDirection, setTrendDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  // Handle every price tick - no debouncing, immediate response
  const handlePriceTick = useCallback((currentPrice: number, prevPrice: number | null) => {
    // Calculate change for this specific tick
    const change = analyzePriceChangeImmediate(currentPrice, prevPrice);

    // Store for display (using state for rendered values)
    setPriceChange(change);
    setTrendDirection(change.direction);

    // Play sound for this tick
    playTick(currentPrice, change);

    // Update last price
    lastPriceRef.current = currentPrice;
  }, [playTick]);

  // React to every price update
  useEffect(() => {
    if (price !== null) {
      handlePriceTick(price, lastPriceRef.current);
    }
  }, [price, handlePriceTick]);

  // Add price to history (throttled separately)
  useEffect(() => {
    if (price !== null) {
      addPrice(price);
    }
  }, [price, addPrice]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">
            BTC Sound
          </h1>
          <p className="text-sm text-zinc-500 text-center">
            Melodic Bitcoin sonification - every tick creates music
          </p>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center"
        >
          <ConnectionStatus state={connectionState} />
        </motion.div>

        {/* Price Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card/50 backdrop-blur border-zinc-800/50">
            <CardContent className="p-8 md:p-12">
              <PriceDisplay price={price} priceChange={priceChange} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Audio Visualizer */}
        {audioState.enabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="bg-card/50 backdrop-blur border-zinc-800/50">
              <CardContent className="p-4">
                <AudioVisualizer
                  mode={visualizerMode}
                  onModeChange={setVisualizerMode}
                  getWaveformData={getWaveformData}
                  getFrequencyData={getFrequencyData}
                  isReady={isReady}
                  trendDirection={trendDirection}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Price Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card/50 backdrop-blur border-zinc-800/50">
            <CardContent className="p-4 md:p-6">
              <PriceChart data={history} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Audio Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Card className="bg-card/50 backdrop-blur border-zinc-800/50 w-full max-w-md">
            <CardContent className="p-6">
              <AudioControls
                audioState={audioState}
                isReady={isReady}
                ticksPerSecond={ticksPerSecond}
                currentSoundPack={currentSoundPack}
                currentPattern={currentPattern}
                harmonyDescription={harmonyDescription}
                onEnable={enableAudio}
                onDisable={disableAudio}
                onMasterVolumeChange={setMasterVolume}
                onLayerVolumeChange={setLayerVolume}
                onSoundModeChange={setSoundMode}
                onScaleChange={setScale}
                onSoundPackChange={setSoundPack}
                onMuteToggle={toggleMute}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-zinc-600 space-y-1"
        >
          <p>
            Real-time data from Binance WebSocket
          </p>
          <p>
            Pentatonic melodies | Multi-layer soundscape | AI harmonies | Every tick = sound
          </p>
        </motion.footer>
      </div>
    </main>
  );
}
