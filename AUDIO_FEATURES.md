# Audio Features and Analysis

dsp.js now includes comprehensive audio analysis features inspired by [librosa](https://github.com/librosa/librosa), optimized for React Native and Expo Go applications.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Basic Features](#basic-features)
  - [STFT and Spectral Analysis](#stft-and-spectral-analysis)
  - [Energy and Loudness](#energy-and-loudness)
  - [Tempo and Rhythm](#tempo-and-rhythm)
  - [Key Detection](#key-detection)
  - [High-Level Metrics](#high-level-metrics)
  - [Audio Loading](#audio-loading)
- [Examples](#examples)
- [React Native Integration](#react-native-integration)

## Features

### Implemented Analysis Functions

- ✅ **Duration**: Calculate audio duration in seconds
- ✅ **BPM (Tempo)**: Detect beats per minute using onset detection and autocorrelation
- ✅ **Key**: Detect musical key (C, D, E, etc.) and mode (major/minor)
- ✅ **Danceability**: Metric based on tempo stability and rhythm strength
- ✅ **Energy**: RMS energy analysis per frame
- ✅ **Loudness**: Loudness in decibels (dB)
- ✅ **Valence**: Emotional valence (happiness/sadness) estimation
- ✅ **STFT**: Short-Time Fourier Transform for time-frequency analysis
- ✅ **Spectral Centroid**: Brightness/center of mass of spectrum
- ✅ **Spectral Rolloff**: Frequency below which X% of energy is contained
- ✅ **Spectral Bandwidth**: Spread of the spectrum around its centroid
- ✅ **Zero Crossing Rate (ZCR)**: Rate of sign changes in the signal
- ✅ **Audio Loading**: Utilities for loading and processing audio in React Native

## Installation

```bash
npm install dsp.js
```

For React Native/Expo projects, you'll also need:

```bash
npx expo install expo-av expo-file-system
```

## Quick Start

```typescript
import {
  getDuration,
  detectTempo,
  detectKey,
  analyzeAudioMetrics,
  getSpectralCentroid,
  computeSTFT
} from 'dsp.js';

// Assuming you have audio samples as Float64Array
const audioBuffer = new Float64Array(44100 * 30); // 30 seconds at 44.1kHz
const sampleRate = 44100;

// Basic analysis
const duration = getDuration(audioBuffer, sampleRate);
console.log(`Duration: ${duration}s`);

// Tempo detection
const tempo = detectTempo(audioBuffer, { sampleRate });
console.log(`BPM: ${tempo.bpm}, Confidence: ${tempo.confidence}`);

// Key detection
const key = detectKey(audioBuffer, sampleRate);
console.log(`Key: ${key.key} ${key.mode}, Confidence: ${key.confidence}`);

// High-level metrics (includes danceability, energy, valence, loudness, tempo)
const metrics = analyzeAudioMetrics(audioBuffer, sampleRate);
console.log(metrics);
/*
{
  danceability: 0.75,
  energy: 0.82,
  valence: 0.68,
  loudness: -8.5,
  tempo: 120
}
*/

// Spectral features
const centroid = getSpectralCentroid(audioBuffer, { sampleRate });
console.log(`Average brightness: ${centroid.reduce((a, b) => a + b) / centroid.length} Hz`);

// STFT for time-frequency analysis
const stft = computeSTFT(audioBuffer, {
  windowSize: 2048,
  hopSize: 512,
  windowType: 'hann',
  sampleRate
});
console.log(`STFT shape: ${stft.numFrames} frames × ${stft.numBins} bins`);
```

## API Reference

### Basic Features

#### `getDuration(buffer, sampleRate)`

Calculate the duration of an audio signal.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `sampleRate: number` - Sample rate in Hz (default: 44100)

**Returns:** `number` - Duration in seconds

**Example:**
```typescript
const duration = getDuration(audioBuffer, 44100);
```

#### `getZeroCrossingRate(buffer, frameSize?, hopSize?)`

Calculate the Zero Crossing Rate (ZCR) of an audio signal. Useful for distinguishing between voiced/unvoiced speech and detecting percussive sounds.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `frameSize: number` - Size of analysis frame (default: 2048)
- `hopSize: number` - Hop size between frames (default: frameSize / 2)

**Returns:** `Float64Array` - Array of ZCR values per frame (normalized to [0, 1])

**Example:**
```typescript
const zcr = getZeroCrossingRate(audioBuffer, 2048, 1024);
const avgZCR = zcr.reduce((a, b) => a + b) / zcr.length;
```

### STFT and Spectral Analysis

#### `computeSTFT(buffer, options?)`

Compute the Short-Time Fourier Transform (STFT) for time-frequency analysis.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `options: STFTOptions` - STFT options:
  - `windowSize?: number` - FFT window size, must be power of 2 (default: 2048)
  - `hopSize?: number` - Hop size between frames (default: windowSize / 4)
  - `windowType?: string` - Window type: 'hann', 'hamming', 'blackman', 'bartlett', 'rectangular' (default: 'hann')
  - `sampleRate?: number` - Sample rate in Hz (default: 44100)

**Returns:** `STFTResult` - Contains:
- `magnitude: Float64Array[]` - Magnitude spectrogram
- `phase: Float64Array[]` - Phase spectrogram
- `frequencies: Float64Array` - Frequency values for each bin (Hz)
- `times: Float64Array` - Time values for each frame (seconds)
- `numBins: number` - Number of frequency bins
- `numFrames: number` - Number of time frames

**Example:**
```typescript
const stft = computeSTFT(audioBuffer, {
  windowSize: 2048,
  hopSize: 512,
  windowType: 'hann',
  sampleRate: 44100
});

// Access magnitude at frame 10, bin 20
const magnitude = stft.magnitude[10][20];
const frequency = stft.frequencies[20];
const time = stft.times[10];
```

#### `getSpectralCentroid(buffer, options?)`

Calculate the spectral centroid (brightness/center of mass of spectrum).

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `options: SpectralOptions` - Analysis options

**Returns:** `Float64Array` - Array of centroid values (Hz) per frame

**Example:**
```typescript
const centroid = getSpectralCentroid(audioBuffer, { sampleRate: 44100 });
const avgBrightness = centroid.reduce((a, b) => a + b) / centroid.length;
```

#### `getSpectralRolloff(buffer, options?, rolloffPercent?)`

Calculate the spectral rolloff (frequency below which X% of energy is contained).

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `options: SpectralOptions` - Analysis options
- `rolloffPercent: number` - Percentage of energy (default: 0.85)

**Returns:** `Float64Array` - Array of rolloff frequencies (Hz) per frame

**Example:**
```typescript
const rolloff = getSpectralRolloff(audioBuffer, { sampleRate: 44100 }, 0.85);
```

#### `getSpectralBandwidth(buffer, options?, p?)`

Calculate the spectral bandwidth (spread around the centroid).

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `options: SpectralOptions` - Analysis options
- `p: number` - Norm order (default: 2 for standard deviation)

**Returns:** `Float64Array` - Array of bandwidth values (Hz) per frame

**Example:**
```typescript
const bandwidth = getSpectralBandwidth(audioBuffer, { sampleRate: 44100 });
```

### Energy and Loudness

#### `getRMSEnergy(buffer, frameSize?, hopSize?)`

Calculate RMS (Root Mean Square) energy per frame.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `frameSize: number` - Size of analysis frame (default: 2048)
- `hopSize: number` - Hop size between frames (default: frameSize / 2)

**Returns:** `Float64Array` - Array of RMS energy values per frame

**Example:**
```typescript
const energy = getRMSEnergy(audioBuffer);
const avgEnergy = energy.reduce((a, b) => a + b) / energy.length;
```

#### `getLoudness(buffer, frameSize?, hopSize?, reference?)`

Calculate loudness in decibels (dB) per frame.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `frameSize: number` - Size of analysis frame (default: 2048)
- `hopSize: number` - Hop size between frames (default: frameSize / 2)
- `reference: number` - Reference value for dB calculation (default: 1.0)

**Returns:** `Float64Array` - Array of loudness values in dB per frame

**Example:**
```typescript
const loudness = getLoudness(audioBuffer);
const avgLoudness = loudness.reduce((a, b) => a + b) / loudness.length;
console.log(`Average loudness: ${avgLoudness.toFixed(2)} dB`);
```

### Tempo and Rhythm

#### `detectTempo(buffer, options?)`

Detect tempo (BPM) using onset detection and autocorrelation.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `options: TempoOptions` - Detection options:
  - `sampleRate?: number` - Sample rate in Hz (default: 44100)
  - `minBPM?: number` - Minimum BPM to consider (default: 60)
  - `maxBPM?: number` - Maximum BPM to consider (default: 200)
  - `hopSize?: number` - Hop size for onset detection (default: 512)

**Returns:** `TempoResult` - Contains:
- `bpm: number` - Detected tempo in BPM
- `confidence: number` - Confidence score (0-1)
- `beats: Float64Array` - Beat positions in seconds

**Example:**
```typescript
const tempo = detectTempo(audioBuffer, {
  sampleRate: 44100,
  minBPM: 60,
  maxBPM: 200
});

console.log(`Tempo: ${tempo.bpm.toFixed(1)} BPM`);
console.log(`Confidence: ${(tempo.confidence * 100).toFixed(1)}%`);
console.log(`Beats at: ${Array.from(tempo.beats).join(', ')}s`);
```

### Key Detection

#### `detectKey(buffer, sampleRate?)`

Detect musical key using chroma features and Krumhansl-Schmuckler key profiles.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `sampleRate: number` - Sample rate in Hz (default: 44100)

**Returns:** `KeyResult` - Contains:
- `key: MusicalKey` - Detected key ('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B')
- `mode: 'major' | 'minor'` - Mode
- `confidence: number` - Confidence score (0-1)
- `chroma: Float64Array[]` - Chroma features for each frame

**Example:**
```typescript
const key = detectKey(audioBuffer, 44100);
console.log(`Key: ${key.key} ${key.mode}`);
console.log(`Confidence: ${(key.confidence * 100).toFixed(1)}%`);
```

### High-Level Metrics

#### `analyzeAudioMetrics(buffer, sampleRate?)`

Analyze high-level perceptual metrics combining multiple low-level features.

**Parameters:**
- `buffer: SampleBuffer` - Audio samples
- `sampleRate: number` - Sample rate in Hz (default: 44100)

**Returns:** `AudioMetrics` - Contains:
- `danceability: number` - Danceability score (0-1), based on tempo stability and rhythm strength
- `energy: number` - Energy score (0-1), based on RMS energy
- `valence: number` - Valence/mood score (0-1), low=sad, high=happy
- `loudness: number` - Average loudness in dB
- `tempo: number` - Tempo in BPM

**Example:**
```typescript
const metrics = analyzeAudioMetrics(audioBuffer, 44100);

console.log(`Danceability: ${(metrics.danceability * 100).toFixed(1)}%`);
console.log(`Energy: ${(metrics.energy * 100).toFixed(1)}%`);
console.log(`Valence: ${(metrics.valence * 100).toFixed(1)}%`);
console.log(`Loudness: ${metrics.loudness.toFixed(2)} dB`);
console.log(`Tempo: ${metrics.tempo.toFixed(1)} BPM`);
```

### Audio Loading

#### `decodePCM(buffer, options)`

Decode raw PCM audio data to Float64Array for DSP processing.

**Parameters:**
- `buffer: ArrayBuffer` - Raw audio buffer
- `options: object` - Format information:
  - `sampleRate: number` - Sample rate in Hz
  - `channels: number` - Number of channels
  - `bitDepth: 8 | 16 | 24 | 32` - Bit depth
  - `float?: boolean` - Whether it's float PCM (default: false)

**Returns:** `AudioData` - Contains decoded samples and metadata

**Example:**
```typescript
const audioData = decodePCM(rawBuffer, {
  sampleRate: 44100,
  channels: 2,
  bitDepth: 16
});

console.log(`Duration: ${audioData.info.duration}s`);
console.log(`Samples: ${audioData.samples.length}`);
```

#### `stereoToMono(buffer)`

Convert stereo audio to mono by averaging channels.

**Example:**
```typescript
const stereoBuffer = new Float64Array([0.5, 0.3, 0.7, 0.4]); // [L, R, L, R, ...]
const monoBuffer = stereoToMono(stereoBuffer);
// Result: [0.4, 0.55]
```

#### `resample(buffer, originalRate, targetRate)`

Resample audio to a different sample rate using linear interpolation.

**Example:**
```typescript
const audio48k = new Float64Array(48000); // 1 second at 48kHz
const audio44k = resample(audio48k, 48000, 44100);
```

#### `normalize(buffer, targetPeak?)`

Normalize audio to a target peak amplitude.

**Example:**
```typescript
const normalized = normalize(audioBuffer, 1.0);
```

#### `trimSilence(buffer, threshold?)`

Trim silence from the beginning and end of audio.

**Example:**
```typescript
const { trimmed, startIndex, endIndex } = trimSilence(audioBuffer, 0.01);
```

#### `applyFade(buffer, fadeInSamples, fadeOutSamples)`

Apply linear fade in/out to audio.

**Example:**
```typescript
const faded = applyFade(audioBuffer, 4410, 4410); // 100ms fade in/out at 44.1kHz
```

## Examples

### Complete Audio Analysis

```typescript
import {
  getDuration,
  detectTempo,
  detectKey,
  analyzeAudioMetrics,
  getSpectralCentroid,
  getSpectralRolloff,
  getZeroCrossingRate,
  computeSTFT
} from 'dsp.js';

function analyzeAudio(audioBuffer: Float64Array, sampleRate: number = 44100) {
  console.log('=== Basic Info ===');
  const duration = getDuration(audioBuffer, sampleRate);
  console.log(`Duration: ${duration.toFixed(2)}s`);

  console.log('\n=== Tempo ===');
  const tempo = detectTempo(audioBuffer, { sampleRate });
  console.log(`BPM: ${tempo.bpm.toFixed(1)}`);
  console.log(`Confidence: ${(tempo.confidence * 100).toFixed(1)}%`);
  console.log(`Beats: ${tempo.beats.length}`);

  console.log('\n=== Key ===');
  const key = detectKey(audioBuffer, sampleRate);
  console.log(`Key: ${key.key} ${key.mode}`);
  console.log(`Confidence: ${(key.confidence * 100).toFixed(1)}%`);

  console.log('\n=== High-Level Metrics ===');
  const metrics = analyzeAudioMetrics(audioBuffer, sampleRate);
  console.log(`Danceability: ${(metrics.danceability * 100).toFixed(1)}%`);
  console.log(`Energy: ${(metrics.energy * 100).toFixed(1)}%`);
  console.log(`Valence: ${(metrics.valence * 100).toFixed(1)}%`);
  console.log(`Loudness: ${metrics.loudness.toFixed(2)} dB`);

  console.log('\n=== Spectral Features ===');
  const centroid = getSpectralCentroid(audioBuffer, { sampleRate });
  const avgCentroid = centroid.reduce((a, b) => a + b) / centroid.length;
  console.log(`Avg Brightness: ${avgCentroid.toFixed(2)} Hz`);

  const rolloff = getSpectralRolloff(audioBuffer, { sampleRate });
  const avgRolloff = rolloff.reduce((a, b) => a + b) / rolloff.length;
  console.log(`Avg Rolloff: ${avgRolloff.toFixed(2)} Hz`);

  const zcr = getZeroCrossingRate(audioBuffer);
  const avgZCR = zcr.reduce((a, b) => a + b) / zcr.length;
  console.log(`Avg ZCR: ${avgZCR.toFixed(4)}`);

  console.log('\n=== STFT ===');
  const stft = computeSTFT(audioBuffer, {
    windowSize: 2048,
    hopSize: 512,
    sampleRate
  });
  console.log(`Shape: ${stft.numFrames} frames × ${stft.numBins} bins`);
  console.log(`Time resolution: ${(stft.times[1] - stft.times[0]).toFixed(4)}s`);
  console.log(`Freq resolution: ${(stft.frequencies[1] - stft.frequencies[0]).toFixed(2)} Hz`);
}
```

## React Native Integration

### Using with expo-av

```typescript
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {
  decodePCM,
  stereoToMono,
  detectTempo,
  detectKey,
  analyzeAudioMetrics
} from 'dsp.js';

async function analyzeAudioFile(uri: string) {
  // 1. Load audio
  const { sound } = await Audio.Sound.createAsync({ uri });
  const status = await sound.getStatusAsync();

  if (!status.isLoaded) {
    throw new Error('Failed to load audio');
  }

  // 2. For PCM extraction, you'll need a native module or export to WAV
  // This is a simplified example - actual implementation depends on your setup

  // 3. Decode PCM data (example with 16-bit stereo)
  const pcmBuffer = /* ... get ArrayBuffer from native module ... */;
  const audioData = decodePCM(pcmBuffer, {
    sampleRate: 44100,
    channels: 2,
    bitDepth: 16
  });

  // 4. Convert to mono
  const mono = stereoToMono(audioData.samples);

  // 5. Analyze
  const tempo = detectTempo(mono, { sampleRate: 44100 });
  const key = detectKey(mono, 44100);
  const metrics = analyzeAudioMetrics(mono, 44100);

  console.log({
    duration: audioData.info.duration,
    tempo: tempo.bpm,
    key: `${key.key} ${key.mode}`,
    ...metrics
  });

  // 6. Cleanup
  await sound.unloadAsync();
}
```

### Real-time Analysis

```typescript
import { getZeroCrossingRate, getRMSEnergy } from 'dsp.js';

// Analyze audio in real-time from microphone or audio stream
function analyzeRealtime(audioChunk: Float64Array) {
  // Quick, lightweight analysis suitable for real-time
  const zcr = getZeroCrossingRate(audioChunk, 512, 256);
  const energy = getRMSEnergy(audioChunk, 512, 256);

  // Current values (last frame)
  const currentZCR = zcr[zcr.length - 1];
  const currentEnergy = energy[energy.length - 1];

  console.log(`ZCR: ${currentZCR.toFixed(4)}, Energy: ${currentEnergy.toFixed(4)}`);
}
```

## Performance Considerations

- **STFT**: Larger window sizes provide better frequency resolution but worse time resolution
- **Tempo Detection**: Requires at least 10-15 seconds of audio for accurate results
- **Key Detection**: Works best with harmonic/melodic content; may be less accurate with percussive-only audio
- **Real-time**: Use smaller frame sizes and hop sizes for lower latency
- **Memory**: Large audio files should be processed in chunks to avoid memory issues

## References

- Implementation inspired by [librosa](https://github.com/librosa/librosa)
- Spectral features algorithms: [musicinformationretrieval.com](https://musicinformationretrieval.com/spectral_features.html)
- Key detection: Krumhansl-Schmuckler key-finding algorithm
- Tempo detection: Onset strength and autocorrelation methods

## Sources

Research and implementation based on:
- [librosa: Audio and music signal analysis in python](https://librosa.org)
- [The Short-Time Fourier Transform](https://www.dsprelated.com/freebooks/sasp/Short_Time_Fourier_Transform.html)
- [Zero-crossing rate - Wikipedia](https://en.wikipedia.org/wiki/Zero-crossing_rate)
- [Spectral centroid - Wikipedia](https://en.wikipedia.org/wiki/Spectral_centroid)
