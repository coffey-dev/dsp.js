/**
 * Audio Features and Analysis Module
 *
 * This module provides comprehensive audio analysis features inspired by librosa,
 * optimized for use with React Native and Expo Go.
 *
 * Features include:
 * - Duration calculation
 * - Zero Crossing Rate (ZCR)
 * - Short-Time Fourier Transform (STFT)
 * - Spectral features (centroid, rolloff, bandwidth)
 * - Energy and loudness analysis
 * - Tempo/BPM detection
 * - Key detection
 * - High-level metrics (danceability, valence, energy)
 *
 * @module audio-features
 */

import type { SampleBuffer } from './types.js';
import { FFT } from './fft.js';
import { WindowFunction } from './window-function.js';

/**
 * Options for STFT analysis
 */
export interface STFTOptions {
  /** FFT window size (power of 2, default: 2048) */
  windowSize?: number;
  /** Hop size between frames (default: windowSize / 4) */
  hopSize?: number;
  /** Window type (default: 'hann') */
  windowType?: 'hann' | 'hamming' | 'blackman' | 'bartlett' | 'rectangular';
  /** Sample rate in Hz (default: 44100) */
  sampleRate?: number;
}

/**
 * Result of STFT analysis
 */
export interface STFTResult {
  /** Magnitude spectrogram [frequency bins × time frames] */
  magnitude: Float64Array[];
  /** Phase spectrogram [frequency bins × time frames] */
  phase: Float64Array[];
  /** Frequency values for each bin (Hz) */
  frequencies: Float64Array;
  /** Time values for each frame (seconds) */
  times: Float64Array;
  /** Number of frequency bins */
  numBins: number;
  /** Number of time frames */
  numFrames: number;
}

/**
 * Options for spectral feature extraction
 */
export interface SpectralOptions {
  /** Sample rate in Hz (default: 44100) */
  sampleRate?: number;
  /** FFT window size (default: 2048) */
  windowSize?: number;
  /** Hop size between frames (default: windowSize / 2) */
  hopSize?: number;
  /** Window type (default: 'hann') */
  windowType?: 'hann' | 'hamming' | 'blackman' | 'bartlett' | 'rectangular';
}

/**
 * Calculate the duration of an audio signal in seconds
 *
 * @param buffer - Audio samples
 * @param sampleRate - Sample rate in Hz (default: 44100)
 * @returns Duration in seconds
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100 * 2); // 2 seconds of audio
 * const duration = getDuration(audioBuffer, 44100);
 * console.log(duration); // 2.0
 * ```
 */
export function getDuration(buffer: SampleBuffer, sampleRate: number = 44100): number {
  return buffer.length / sampleRate;
}

/**
 * Calculate the Zero Crossing Rate (ZCR) of an audio signal
 *
 * Zero Crossing Rate is the rate at which the signal changes sign.
 * It's useful for distinguishing between voiced and unvoiced speech,
 * and for detecting percussive sounds.
 *
 * Formula: ZCR = (1/N) * Σ|sign(x[n]) - sign(x[n-1])|
 *
 * @param buffer - Audio samples
 * @param frameSize - Size of analysis frame (default: 2048)
 * @param hopSize - Hop size between frames (default: frameSize / 2)
 * @returns Array of ZCR values per frame (normalized to [0, 1])
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100); // 1 second of audio
 * const zcr = getZeroCrossingRate(audioBuffer);
 * console.log(zcr); // Array of ZCR values per frame
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Zero-crossing_rate
 */
export function getZeroCrossingRate(
  buffer: SampleBuffer,
  frameSize: number = 2048,
  hopSize?: number
): Float64Array {
  const hop = hopSize ?? Math.floor(frameSize / 2);
  const numFrames = Math.floor((buffer.length - frameSize) / hop) + 1;
  const zcr = new Float64Array(numFrames);

  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hop;
    const end = Math.min(start + frameSize, buffer.length);
    let crossings = 0;

    // Calculate mean for the frame (signal should be zero-mean)
    let mean = 0;
    for (let i = start; i < end; i++) {
      mean += buffer[i];
    }
    mean /= (end - start);

    // Count zero crossings
    for (let i = start + 1; i < end; i++) {
      const current = buffer[i] - mean;
      const previous = buffer[i - 1] - mean;

      // Check if sign changes
      if ((current > 0 && previous <= 0) || (current < 0 && previous >= 0)) {
        crossings++;
      }
    }

    // Normalize by frame length
    zcr[frame] = crossings / (end - start - 1);
  }

  return zcr;
}

/**
 * Get the window function values for STFT
 */
function getWindowFunction(windowType: string, size: number): Float64Array {
  const windowFunc = new WindowFunction(windowType.toUpperCase() as any);
  const buffer = new Float64Array(size);
  // Fill with ones before applying window
  for (let i = 0; i < size; i++) {
    buffer[i] = 1;
  }
  windowFunc.process(buffer);
  return buffer;
}

/**
 * Short-Time Fourier Transform (STFT)
 *
 * Computes the STFT of an audio signal, providing time-frequency representation.
 * The STFT applies FFT to overlapping windowed segments of the signal.
 *
 * @param buffer - Audio samples
 * @param options - STFT options
 * @returns STFT result containing magnitude and phase spectrograms
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100); // 1 second of audio
 * const stft = computeSTFT(audioBuffer, {
 *   windowSize: 2048,
 *   hopSize: 512,
 *   windowType: 'hann',
 *   sampleRate: 44100
 * });
 * console.log(stft.magnitude.length); // Number of time frames
 * console.log(stft.magnitude[0].length); // Number of frequency bins
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Short-time_Fourier_transform
 */
export function computeSTFT(
  buffer: SampleBuffer,
  options: STFTOptions = {}
): STFTResult {
  const windowSize = options.windowSize ?? 2048;
  const hopSize = options.hopSize ?? Math.floor(windowSize / 4);
  const windowType = options.windowType ?? 'hann';
  const sampleRate = options.sampleRate ?? 44100;

  // Validate window size is power of 2
  if ((windowSize & (windowSize - 1)) !== 0) {
    throw new Error('Window size must be a power of 2');
  }

  const numFrames = Math.floor((buffer.length - windowSize) / hopSize) + 1;
  const numBins = windowSize / 2 + 1;

  // Pre-compute window function
  const window = getWindowFunction(windowType, windowSize);

  // Initialize FFT
  const fft = new FFT(windowSize, sampleRate);

  // Allocate output arrays
  const magnitude: Float64Array[] = [];
  const phase: Float64Array[] = [];

  // Process each frame
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopSize;
    const frameBuffer = new Float64Array(windowSize);

    // Apply window function
    for (let i = 0; i < windowSize; i++) {
      if (start + i < buffer.length) {
        frameBuffer[i] = buffer[start + i] * window[i];
      }
    }

    // Compute FFT
    fft.forward(frameBuffer);

    // Extract magnitude and phase (only positive frequencies)
    const frameMagnitude = new Float64Array(numBins);
    const framePhase = new Float64Array(numBins);

    for (let i = 0; i < numBins; i++) {
      const real = fft.real[i];
      const imag = fft.imag[i];
      frameMagnitude[i] = Math.sqrt(real * real + imag * imag);
      framePhase[i] = Math.atan2(imag, real);
    }

    magnitude.push(frameMagnitude);
    phase.push(framePhase);
  }

  // Compute frequency and time axes
  const frequencies = new Float64Array(numBins);
  for (let i = 0; i < numBins; i++) {
    frequencies[i] = (i * sampleRate) / windowSize;
  }

  const times = new Float64Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    times[i] = (i * hopSize) / sampleRate;
  }

  return {
    magnitude,
    phase,
    frequencies,
    times,
    numBins,
    numFrames
  };
}

/**
 * Calculate the spectral centroid of an audio signal
 *
 * The spectral centroid indicates where the "center of mass" of the spectrum is located.
 * It's often associated with the brightness of a sound.
 *
 * Formula: centroid[t] = Σ(S[k,t] × freq[k]) / Σ(S[k,t])
 *
 * @param buffer - Audio samples
 * @param options - Spectral analysis options
 * @returns Array of spectral centroid values (Hz) per frame
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100);
 * const centroid = getSpectralCentroid(audioBuffer, { sampleRate: 44100 });
 * console.log(centroid); // Array of centroid values in Hz
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Spectral_centroid
 */
export function getSpectralCentroid(
  buffer: SampleBuffer,
  options: SpectralOptions = {}
): Float64Array {
  const sampleRate = options.sampleRate ?? 44100;
  const windowSize = options.windowSize ?? 2048;
  const hopSize = options.hopSize ?? Math.floor(windowSize / 2);

  // Compute STFT
  const stft = computeSTFT(buffer, {
    windowSize,
    hopSize,
    windowType: options.windowType,
    sampleRate
  });

  const centroid = new Float64Array(stft.numFrames);

  // Calculate centroid for each frame
  for (let frame = 0; frame < stft.numFrames; frame++) {
    const magnitude = stft.magnitude[frame];
    let weightedSum = 0;
    let totalMagnitude = 0;

    for (let bin = 0; bin < stft.numBins; bin++) {
      const mag = magnitude[bin];
      const freq = stft.frequencies[bin];
      weightedSum += mag * freq;
      totalMagnitude += mag;
    }

    // Avoid division by zero
    centroid[frame] = totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
  }

  return centroid;
}

/**
 * Calculate the spectral rolloff of an audio signal
 *
 * The spectral rolloff is the frequency below which a specified percentage
 * (default 85%) of the total spectral energy is contained.
 *
 * @param buffer - Audio samples
 * @param options - Spectral analysis options
 * @param rolloffPercent - Percentage of energy (default: 0.85)
 * @returns Array of spectral rolloff values (Hz) per frame
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100);
 * const rolloff = getSpectralRolloff(audioBuffer, { sampleRate: 44100 }, 0.85);
 * console.log(rolloff); // Array of rolloff frequencies in Hz
 * ```
 */
export function getSpectralRolloff(
  buffer: SampleBuffer,
  options: SpectralOptions = {},
  rolloffPercent: number = 0.85
): Float64Array {
  const sampleRate = options.sampleRate ?? 44100;
  const windowSize = options.windowSize ?? 2048;
  const hopSize = options.hopSize ?? Math.floor(windowSize / 2);

  // Compute STFT
  const stft = computeSTFT(buffer, {
    windowSize,
    hopSize,
    windowType: options.windowType,
    sampleRate
  });

  const rolloff = new Float64Array(stft.numFrames);

  // Calculate rolloff for each frame
  for (let frame = 0; frame < stft.numFrames; frame++) {
    const magnitude = stft.magnitude[frame];

    // Calculate total energy
    let totalEnergy = 0;
    for (let bin = 0; bin < stft.numBins; bin++) {
      totalEnergy += magnitude[bin];
    }

    const threshold = totalEnergy * rolloffPercent;
    let cumulativeEnergy = 0;
    let rolloffBin = 0;

    // Find the bin where cumulative energy exceeds threshold
    for (let bin = 0; bin < stft.numBins; bin++) {
      cumulativeEnergy += magnitude[bin];
      if (cumulativeEnergy >= threshold) {
        rolloffBin = bin;
        break;
      }
    }

    rolloff[frame] = stft.frequencies[rolloffBin];
  }

  return rolloff;
}

/**
 * Calculate the spectral bandwidth of an audio signal
 *
 * The spectral bandwidth is the weighted standard deviation of the frequencies
 * with respect to the spectral centroid.
 *
 * Formula: bandwidth[t] = (Σ(S[k,t] × (freq[k] - centroid[t])^p))^(1/p)
 *
 * @param buffer - Audio samples
 * @param options - Spectral analysis options
 * @param p - Norm order (default: 2 for standard deviation)
 * @returns Array of spectral bandwidth values (Hz) per frame
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100);
 * const bandwidth = getSpectralBandwidth(audioBuffer, { sampleRate: 44100 });
 * console.log(bandwidth); // Array of bandwidth values in Hz
 * ```
 */
export function getSpectralBandwidth(
  buffer: SampleBuffer,
  options: SpectralOptions = {},
  p: number = 2
): Float64Array {
  const sampleRate = options.sampleRate ?? 44100;
  const windowSize = options.windowSize ?? 2048;
  const hopSize = options.hopSize ?? Math.floor(windowSize / 2);

  // Compute STFT
  const stft = computeSTFT(buffer, {
    windowSize,
    hopSize,
    windowType: options.windowType,
    sampleRate
  });

  // First calculate centroids
  const centroid = getSpectralCentroid(buffer, options);
  const bandwidth = new Float64Array(stft.numFrames);

  // Calculate bandwidth for each frame
  for (let frame = 0; frame < stft.numFrames; frame++) {
    const magnitude = stft.magnitude[frame];
    const cent = centroid[frame];
    let weightedSum = 0;
    let totalMagnitude = 0;

    for (let bin = 0; bin < stft.numBins; bin++) {
      const mag = magnitude[bin];
      const freq = stft.frequencies[bin];
      const deviation = Math.abs(freq - cent);
      weightedSum += mag * Math.pow(deviation, p);
      totalMagnitude += mag;
    }

    // Avoid division by zero
    if (totalMagnitude > 0) {
      bandwidth[frame] = Math.pow(weightedSum / totalMagnitude, 1 / p);
    } else {
      bandwidth[frame] = 0;
    }
  }

  return bandwidth;
}

/**
 * Calculate RMS energy of an audio signal per frame
 *
 * Root Mean Square (RMS) energy provides a measure of the signal's power.
 * Higher values indicate louder or more energetic audio.
 *
 * Formula: RMS = sqrt((1/N) × Σ(x[n]^2))
 *
 * @param buffer - Audio samples
 * @param frameSize - Size of analysis frame (default: 2048)
 * @param hopSize - Hop size between frames (default: frameSize / 2)
 * @returns Array of RMS energy values per frame
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100);
 * const energy = getRMSEnergy(audioBuffer);
 * console.log(energy); // Array of RMS values per frame
 * ```
 */
export function getRMSEnergy(
  buffer: SampleBuffer,
  frameSize: number = 2048,
  hopSize?: number
): Float64Array {
  const hop = hopSize ?? Math.floor(frameSize / 2);
  const numFrames = Math.floor((buffer.length - frameSize) / hop) + 1;
  const rms = new Float64Array(numFrames);

  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hop;
    const end = Math.min(start + frameSize, buffer.length);
    let sumSquares = 0;

    for (let i = start; i < end; i++) {
      sumSquares += buffer[i] * buffer[i];
    }

    rms[frame] = Math.sqrt(sumSquares / (end - start));
  }

  return rms;
}

/**
 * Calculate loudness in dB (decibels) per frame
 *
 * Converts RMS energy to decibels using a reference value.
 * Standard reference is 1.0 for full-scale digital audio.
 *
 * Formula: dB = 20 × log10(RMS / reference)
 *
 * @param buffer - Audio samples
 * @param frameSize - Size of analysis frame (default: 2048)
 * @param hopSize - Hop size between frames (default: frameSize / 2)
 * @param reference - Reference value for dB calculation (default: 1.0)
 * @returns Array of loudness values in dB per frame
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100);
 * const loudness = getLoudness(audioBuffer);
 * console.log(loudness); // Array of loudness values in dB
 * ```
 */
export function getLoudness(
  buffer: SampleBuffer,
  frameSize: number = 2048,
  hopSize?: number,
  reference: number = 1.0
): Float64Array {
  const rms = getRMSEnergy(buffer, frameSize, hopSize);
  const loudness = new Float64Array(rms.length);

  for (let i = 0; i < rms.length; i++) {
    // Avoid log of zero
    if (rms[i] > 0) {
      loudness[i] = 20 * Math.log10(rms[i] / reference);
    } else {
      loudness[i] = -100; // Minimum loudness threshold
    }
  }

  return loudness;
}

/**
 * Options for tempo/BPM detection
 */
export interface TempoOptions {
  /** Sample rate in Hz (default: 44100) */
  sampleRate?: number;
  /** Minimum BPM to consider (default: 60) */
  minBPM?: number;
  /** Maximum BPM to consider (default: 200) */
  maxBPM?: number;
  /** Hop size for onset detection (default: 512) */
  hopSize?: number;
}

/**
 * Result of tempo detection
 */
export interface TempoResult {
  /** Detected tempo in BPM */
  bpm: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Beat positions in seconds */
  beats: Float64Array;
}

/**
 * Detect tempo (BPM) of an audio signal
 *
 * Uses onset strength envelope and autocorrelation to estimate tempo.
 * The algorithm detects peaks in the onset envelope and finds the most
 * likely tempo based on the periodicity of these peaks.
 *
 * @param buffer - Audio samples
 * @param options - Tempo detection options
 * @returns Tempo result with BPM, confidence, and beat positions
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100 * 30); // 30 seconds
 * const tempo = detectTempo(audioBuffer, { sampleRate: 44100 });
 * console.log(`BPM: ${tempo.bpm}, Confidence: ${tempo.confidence}`);
 * ```
 */
export function detectTempo(
  buffer: SampleBuffer,
  options: TempoOptions = {}
): TempoResult {
  const sampleRate = options.sampleRate ?? 44100;
  const minBPM = options.minBPM ?? 60;
  const maxBPM = options.maxBPM ?? 200;
  const hopSize = options.hopSize ?? 512;

  // Compute onset strength envelope using spectral flux
  const onsetEnvelope = computeOnsetStrength(buffer, sampleRate, hopSize);

  // Apply autocorrelation to find periodicity
  const autocorr = computeAutocorrelation(onsetEnvelope);

  // Convert lag to BPM and find peak
  const hopDuration = hopSize / sampleRate;
  const minLag = Math.floor((60 / maxBPM) / hopDuration);
  const maxLag = Math.floor((60 / minBPM) / hopDuration);

  let maxCorr = -Infinity;
  let bestLag = minLag;

  for (let lag = minLag; lag <= Math.min(maxLag, autocorr.length - 1); lag++) {
    if (autocorr[lag] > maxCorr) {
      maxCorr = autocorr[lag];
      bestLag = lag;
    }
  }

  const bpm = 60 / (bestLag * hopDuration);
  const confidence = Math.min(maxCorr, 1.0);

  // Detect beat positions
  const beats = detectBeats(onsetEnvelope, bpm, hopDuration);

  return { bpm, confidence, beats };
}

/**
 * Compute onset strength envelope using spectral flux
 */
function computeOnsetStrength(
  buffer: SampleBuffer,
  sampleRate: number,
  hopSize: number
): Float64Array {
  const windowSize = hopSize * 2;

  // Compute STFT
  const stft = computeSTFT(buffer, {
    windowSize,
    hopSize,
    sampleRate,
    windowType: 'hann'
  });

  const onsetStrength = new Float64Array(stft.numFrames);

  // Calculate spectral flux (difference between consecutive frames)
  for (let frame = 1; frame < stft.numFrames; frame++) {
    let flux = 0;
    for (let bin = 0; bin < stft.numBins; bin++) {
      const diff = stft.magnitude[frame][bin] - stft.magnitude[frame - 1][bin];
      // Only consider increases (positive flux)
      flux += Math.max(0, diff);
    }
    onsetStrength[frame] = flux;
  }

  // Normalize
  const maxStrength = Math.max(...Array.from(onsetStrength));
  if (maxStrength > 0) {
    for (let i = 0; i < onsetStrength.length; i++) {
      onsetStrength[i] /= maxStrength;
    }
  }

  return onsetStrength;
}

/**
 * Compute autocorrelation of a signal
 */
function computeAutocorrelation(signal: Float64Array): Float64Array {
  const n = signal.length;
  const autocorr = new Float64Array(n);

  // Compute mean
  let mean = 0;
  for (let i = 0; i < n; i++) {
    mean += signal[i];
  }
  mean /= n;

  // Compute autocorrelation
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (signal[i] - mean) * (signal[i + lag] - mean);
      count++;
    }
    autocorr[lag] = count > 0 ? sum / count : 0;
  }

  // Normalize by zero-lag autocorrelation
  if (autocorr[0] > 0) {
    for (let i = 0; i < n; i++) {
      autocorr[i] /= autocorr[0];
    }
  }

  return autocorr;
}

/**
 * Detect beat positions from onset envelope
 */
function detectBeats(
  onsetEnvelope: Float64Array,
  bpm: number,
  hopDuration: number
): Float64Array {
  const beatInterval = 60 / bpm; // seconds
  const beatIntervalFrames = Math.round(beatInterval / hopDuration);

  // Find peaks in onset envelope
  const peaks: number[] = [];
  for (let i = 1; i < onsetEnvelope.length - 1; i++) {
    if (onsetEnvelope[i] > onsetEnvelope[i - 1] &&
        onsetEnvelope[i] > onsetEnvelope[i + 1] &&
        onsetEnvelope[i] > 0.1) { // Threshold
      peaks.push(i);
    }
  }

  // Select beats based on expected interval
  const beats: number[] = [];
  let lastBeat = -beatIntervalFrames;

  for (const peak of peaks) {
    if (peak - lastBeat >= beatIntervalFrames * 0.8) {
      beats.push(peak * hopDuration);
      lastBeat = peak;
    }
  }

  return new Float64Array(beats);
}

/**
 * Musical keys
 */
export const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
] as const;

export type MusicalKey = typeof MUSICAL_KEYS[number];

/**
 * Key detection result
 */
export interface KeyResult {
  /** Detected key (e.g., 'C', 'D#', etc.) */
  key: MusicalKey;
  /** Mode: 'major' or 'minor' */
  mode: 'major' | 'minor';
  /** Confidence score (0-1) */
  confidence: number;
  /** Chroma features for each frame */
  chroma: Float64Array[];
}

/**
 * Detect musical key of an audio signal
 *
 * Uses chroma features (pitch class profiles) to determine the key.
 * Compares the average chroma vector with key templates using correlation.
 *
 * @param buffer - Audio samples
 * @param sampleRate - Sample rate in Hz (default: 44100)
 * @returns Key detection result
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100 * 30); // 30 seconds
 * const key = detectKey(audioBuffer, 44100);
 * console.log(`Key: ${key.key} ${key.mode}, Confidence: ${key.confidence}`);
 * ```
 */
export function detectKey(
  buffer: SampleBuffer,
  sampleRate: number = 44100
): KeyResult {
  // Compute chroma features
  const chroma = computeChroma(buffer, sampleRate);

  // Average chroma across all frames
  const avgChroma = new Float64Array(12);
  for (let i = 0; i < 12; i++) {
    let sum = 0;
    for (const frame of chroma) {
      sum += frame[i];
    }
    avgChroma[i] = sum / chroma.length;
  }

  // Normalize
  const maxChroma = Math.max(...Array.from(avgChroma));
  if (maxChroma > 0) {
    for (let i = 0; i < 12; i++) {
      avgChroma[i] /= maxChroma;
    }
  }

  // Key templates (Krumhansl-Schmuckler key profiles)
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  // Find best matching key
  let bestKey = 0;
  let bestMode: 'major' | 'minor' = 'major';
  let maxCorrelation = -Infinity;

  for (let key = 0; key < 12; key++) {
    // Major
    const majorCorr = correlate(avgChroma, rotateArray(majorProfile, key));
    if (majorCorr > maxCorrelation) {
      maxCorrelation = majorCorr;
      bestKey = key;
      bestMode = 'major';
    }

    // Minor
    const minorCorr = correlate(avgChroma, rotateArray(minorProfile, key));
    if (minorCorr > maxCorrelation) {
      maxCorrelation = minorCorr;
      bestKey = key;
      bestMode = 'minor';
    }
  }

  return {
    key: MUSICAL_KEYS[bestKey],
    mode: bestMode,
    confidence: Math.min(Math.max(maxCorrelation, 0), 1),
    chroma
  };
}

/**
 * Compute chroma features (pitch class profiles)
 */
function computeChroma(
  buffer: SampleBuffer,
  sampleRate: number
): Float64Array[] {
  const windowSize = 4096;
  const hopSize = 2048;

  // Compute STFT
  const stft = computeSTFT(buffer, {
    windowSize,
    hopSize,
    sampleRate,
    windowType: 'hann'
  });

  const chroma: Float64Array[] = [];
  const A440 = 440.0; // Reference frequency

  // Map each frequency bin to a chroma bin (0-11 for C through B)
  for (let frame = 0; frame < stft.numFrames; frame++) {
    const chromaFrame = new Float64Array(12);

    for (let bin = 1; bin < stft.numBins; bin++) { // Skip DC component
      const freq = stft.frequencies[bin];
      if (freq > 0) {
        // Convert frequency to MIDI note number
        const midi = 69 + 12 * Math.log2(freq / A440);
        // Map to chroma (0-11)
        const chromaBin = Math.round(midi) % 12;
        if (chromaBin >= 0 && chromaBin < 12) {
          chromaFrame[chromaBin] += stft.magnitude[frame][bin];
        }
      }
    }

    // Normalize
    const maxVal = Math.max(...Array.from(chromaFrame));
    if (maxVal > 0) {
      for (let i = 0; i < 12; i++) {
        chromaFrame[i] /= maxVal;
      }
    }

    chroma.push(chromaFrame);
  }

  return chroma;
}

/**
 * Compute correlation between two arrays
 */
function correlate(a: Float64Array | number[], b: Float64Array | number[]): number {
  let sum = 0;
  let sumA = 0;
  let sumB = 0;
  let sumA2 = 0;
  let sumB2 = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    sumA += a[i];
    sumB += b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }

  const n = a.length;
  const numerator = n * sum - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Rotate an array by n positions
 */
function rotateArray(arr: number[], n: number): number[] {
  const result = [...arr];
  const len = arr.length;
  n = n % len;
  return [...result.slice(len - n), ...result.slice(0, len - n)];
}

/**
 * High-level audio metrics
 */
export interface AudioMetrics {
  /** Danceability score (0-1) */
  danceability: number;
  /** Energy score (0-1) */
  energy: number;
  /** Valence/mood score (0-1, low=sad, high=happy) */
  valence: number;
  /** Average loudness in dB */
  loudness: number;
  /** Tempo in BPM */
  tempo: number;
}

/**
 * Analyze high-level audio metrics
 *
 * Combines multiple low-level features to compute high-level perceptual metrics:
 * - Danceability: Based on tempo stability, rhythm strength, and beat regularity
 * - Energy: Based on RMS energy and spectral characteristics
 * - Valence: Based on spectral features (brightness, harmony)
 *
 * @param buffer - Audio samples
 * @param sampleRate - Sample rate in Hz (default: 44100)
 * @returns Audio metrics object
 *
 * @example
 * ```typescript
 * const audioBuffer = new Float64Array(44100 * 30); // 30 seconds
 * const metrics = analyzeAudioMetrics(audioBuffer, 44100);
 * console.log(metrics);
 * // { danceability: 0.75, energy: 0.82, valence: 0.68, loudness: -8.5, tempo: 120 }
 * ```
 */
export function analyzeAudioMetrics(
  buffer: SampleBuffer,
  sampleRate: number = 44100
): AudioMetrics {
  // Detect tempo
  const tempoResult = detectTempo(buffer, { sampleRate });

  // Calculate energy
  const rmsEnergy = getRMSEnergy(buffer);
  const avgEnergy = rmsEnergy.reduce((sum, val) => sum + val, 0) / rmsEnergy.length;
  const energy = Math.min(avgEnergy * 10, 1.0); // Normalize to 0-1

  // Calculate loudness
  const loudnessValues = getLoudness(buffer);
  const loudness = loudnessValues.reduce((sum, val) => sum + val, 0) / loudnessValues.length;

  // Calculate spectral features for valence
  const centroid = getSpectralCentroid(buffer, { sampleRate });
  const avgCentroid = centroid.reduce((sum, val) => sum + val, 0) / centroid.length;
  const normalizedCentroid = Math.min(avgCentroid / 4000, 1.0); // Normalize

  // Calculate ZCR (correlated with brightness/valence)
  const zcr = getZeroCrossingRate(buffer);
  const avgZCR = zcr.reduce((sum, val) => sum + val, 0) / zcr.length;

  // Valence: combination of brightness (centroid) and ZCR
  const valence = (normalizedCentroid * 0.7 + avgZCR * 10 * 0.3);

  // Danceability: based on tempo, beat strength, and regularity
  const tempoScore = gaussianScore(tempoResult.bpm, 120, 30); // Peak at 120 BPM
  const beatStrength = tempoResult.confidence;
  const danceability = (tempoScore * 0.6 + beatStrength * 0.4);

  return {
    danceability: Math.min(Math.max(danceability, 0), 1),
    energy: Math.min(Math.max(energy, 0), 1),
    valence: Math.min(Math.max(valence, 0), 1),
    loudness,
    tempo: tempoResult.bpm
  };
}

/**
 * Gaussian scoring function
 */
function gaussianScore(value: number, mean: number, std: number): number {
  const exponent = -Math.pow(value - mean, 2) / (2 * Math.pow(std, 2));
  return Math.exp(exponent);
}
