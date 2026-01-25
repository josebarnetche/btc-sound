# BTC Sound

Real-time Bitcoin price sonification - transforming market movements into melodic music.

## What is BTC Sound?

BTC Sound is a web application that converts live Bitcoin (BTC/USDT) price data from Binance into an immersive audio experience. Every price tick generates musical notes, creating a unique soundscape that represents market activity in real-time.

- **Price goes up** = Bright, ascending tones
- **Price goes down** = Dark, descending tones
- **Every tick** = A new note in the melody

## Features

- **Real-time Price Data**: Live BTC/USDT prices via Binance WebSocket
- **Melodic Sonification**: Price movements converted to musical notes using Tone.js
- **Multi-layer Audio Engine**:
  - Tick notes (main melody)
  - Bass layer
  - Ambient pads
  - Percussion
- **Sound Modes**: Minimal, Standard, Full, and Ambient presets
- **Musical Scales**: Pentatonic, Major, Minor, and Chromatic
- **Live Price Chart**: Visual representation of price history with Recharts
- **Animated UI**: Smooth transitions and visual feedback with Framer Motion
- **Individual Layer Control**: Adjust volume for each audio layer independently

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Audio Engine**: Tone.js
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Data Source**: Binance WebSocket API

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) and click "Enable Sound" to start the experience.

## Next Features (Roadmap)

### 1. Multi-Cryptocurrency Support
Add support for other trading pairs (ETH/USDT, SOL/USDT, etc.) with the ability to switch between them or listen to multiple pairs simultaneously.

### 2. Custom Sound Packs
Allow users to upload or select from different instrument presets (piano, synth, bells, 8-bit, orchestral) to personalize their listening experience.

### 3. Price Alert Sounds
Add configurable price threshold alerts with distinct audio cues when BTC reaches user-defined price levels.

### 4. Recording & Export
Enable users to record their sonification sessions and export them as audio files (WAV/MP3) to share or use as ambient background music.

### 5. Visual Equalizer / Waveform Display
Add a real-time audio visualization component showing waveforms, frequency spectrum, or an artistic equalizer that responds to the generated sounds.

### 6. Historical Playback Mode
Allow users to "replay" historical price data from specific dates, experiencing what the market sounded like during major events (halvings, crashes, rallies).

### 7. Social Sharing & Live Rooms
Create shareable listening rooms where multiple users can experience the same sonification together in real-time with a chat feature.

### 8. Mobile App (PWA)
Convert to a Progressive Web App with offline support, push notifications for price alerts, and optimized mobile controls.

### 9. AI-Generated Melodies
Use machine learning to detect patterns in price movements and generate more complex, harmonically rich compositions based on market sentiment.

### 10. Integration with Trading Platforms
Add optional integration with exchanges (via API keys) to sonify the user's own portfolio changes, open orders, and executed trades.

## License

MIT
