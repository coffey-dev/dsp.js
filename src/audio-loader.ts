/**
 * Audio Loader Module for React Native and Expo Go
 *
 * This module provides utilities for loading and decoding audio files
 * in React Native and Expo Go environments.
 *
 * Supports:
 * - Loading from file URIs
 * - Loading from assets
 * - Decoding to PCM samples
 * - Resampling
 * - Channel conversion (stereo to mono)
 *
 * @module audio-loader
 */

import type { SampleBuffer } from './types.js';

/**
 * Audio metadata information
 */
export interface AudioInfo {
  /** Duration in seconds */
  duration: number;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Number of samples per channel */
  samples: number;
  /** Bit depth */
  bitDepth?: number;
}

/**
 * Loaded audio data
 */
export interface AudioData {
  /** Audio samples (mono or interleaved stereo) */
  samples: Float64Array;
  /** Audio metadata */
  info: AudioInfo;
}

/**
 * Options for loading audio
 */
export interface LoadAudioOptions {
  /** Target sample rate (will resample if different from source) */
  sampleRate?: number;
  /** Convert to mono (default: false) */
  mono?: boolean;
  /** Start time in seconds (default: 0) */
  startTime?: number;
  /** Duration to load in seconds (default: entire file) */
  duration?: number;
}

/**
 * Load audio from a URI (React Native/Expo compatible)
 *
 * Note: This function provides a template for loading audio in React Native.
 * You'll need to integrate with expo-av or react-native-sound for actual
 * audio loading functionality.
 *
 * @param uri - Audio file URI (file://, asset://, or http://)
 * @param options - Loading options
 * @returns Promise resolving to audio data
 *
 * @example
 * ```typescript
 * import { Audio } from 'expo-av';
 *
 * // Load audio using expo-av
 * const { sound } = await Audio.Sound.createAsync(
 *   require('./audio.mp3')
 * );
 *
 * // Get audio data (you'll need to implement PCM extraction)
 * const audioData = await loadAudioFromURI('file://path/to/audio.mp3', {
 *   sampleRate: 44100,
 *   mono: true
 * });
 * ```
 */
export async function loadAudioFromURI(
  _uri: string,
  _options: LoadAudioOptions = {}
): Promise<AudioData> {
  // This is a template implementation
  // In a real React Native app, you would use expo-av or react-native-sound
  throw new Error(
    'loadAudioFromURI requires integration with expo-av or react-native-sound. ' +
    'See documentation for implementation examples.'
  );
}

/**
 * Decode PCM audio data from ArrayBuffer
 *
 * Converts raw PCM audio data (Int16Array, Float32Array, etc.) to Float64Array
 * suitable for DSP processing.
 *
 * @param buffer - Raw audio buffer
 * @param options - Audio format information
 * @returns Decoded audio data
 *
 * @example
 * ```typescript
 * // Decode 16-bit PCM audio
 * const rawBuffer = new ArrayBuffer(88200); // 1 second at 44.1kHz
 * const audioData = decodePCM(rawBuffer, {
 *   sampleRate: 44100,
 *   channels: 1,
 *   bitDepth: 16
 * });
 * ```
 */
export function decodePCM(
  buffer: ArrayBuffer,
  options: {
    sampleRate: number;
    channels: number;
    bitDepth: 8 | 16 | 24 | 32;
    float?: boolean;
  }
): AudioData {
  const { sampleRate, channels, bitDepth, float = false } = options;
  let samples: Float64Array;

  if (float && bitDepth === 32) {
    // Float32 PCM
    const float32 = new Float32Array(buffer);
    samples = new Float64Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      samples[i] = float32[i];
    }
  } else if (bitDepth === 16) {
    // Int16 PCM
    const int16 = new Int16Array(buffer);
    samples = new Float64Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      samples[i] = int16[i] / 32768.0; // Normalize to [-1, 1]
    }
  } else if (bitDepth === 8) {
    // Int8 PCM
    const int8 = new Int8Array(buffer);
    samples = new Float64Array(int8.length);
    for (let i = 0; i < int8.length; i++) {
      samples[i] = int8[i] / 128.0; // Normalize to [-1, 1]
    }
  } else if (bitDepth === 24) {
    // 24-bit PCM (stored as 3 bytes per sample)
    const uint8 = new Uint8Array(buffer);
    const numSamples = uint8.length / 3;
    samples = new Float64Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const offset = i * 3;
      // Combine 3 bytes into 24-bit signed integer
      let sample = (uint8[offset] | (uint8[offset + 1] << 8) | (uint8[offset + 2] << 16));
      // Sign extend if negative
      if (sample & 0x800000) {
        sample |= 0xFF000000;
      }
      samples[i] = sample / 8388608.0; // Normalize to [-1, 1]
    }
  } else if (bitDepth === 32 && !float) {
    // Int32 PCM
    const int32 = new Int32Array(buffer);
    samples = new Float64Array(int32.length);
    for (let i = 0; i < int32.length; i++) {
      samples[i] = int32[i] / 2147483648.0; // Normalize to [-1, 1]
    }
  } else {
    throw new Error(`Unsupported bit depth: ${bitDepth} (float: ${float})`);
  }

  const samplesPerChannel = samples.length / channels;

  return {
    samples,
    info: {
      duration: samplesPerChannel / sampleRate,
      sampleRate,
      channels,
      samples: samplesPerChannel,
      bitDepth
    }
  };
}

/**
 * Convert stereo audio to mono by averaging channels
 *
 * @param buffer - Interleaved stereo samples [L, R, L, R, ...]
 * @returns Mono samples
 *
 * @example
 * ```typescript
 * const stereo = new Float64Array([0.5, 0.3, 0.7, 0.4]); // 2 stereo samples
 * const mono = stereoToMono(stereo);
 * console.log(mono); // [0.4, 0.55] (averaged)
 * ```
 */
export function stereoToMono(buffer: SampleBuffer): Float64Array {
  const monoLength = Math.floor(buffer.length / 2);
  const mono = new Float64Array(monoLength);

  for (let i = 0; i < monoLength; i++) {
    const left = buffer[i * 2];
    const right = buffer[i * 2 + 1];
    mono[i] = (left + right) / 2;
  }

  return mono;
}

/**
 * Extract a single channel from multi-channel audio
 *
 * @param buffer - Interleaved multi-channel samples
 * @param channelIndex - Channel to extract (0 = left, 1 = right)
 * @param numChannels - Total number of channels (default: 2)
 * @returns Single channel samples
 *
 * @example
 * ```typescript
 * const stereo = new Float64Array([0.5, 0.3, 0.7, 0.4]); // 2 stereo samples
 * const left = extractChannel(stereo, 0, 2);
 * console.log(left); // [0.5, 0.7]
 * const right = extractChannel(stereo, 1, 2);
 * console.log(right); // [0.3, 0.4]
 * ```
 */
export function extractChannel(
  buffer: SampleBuffer,
  channelIndex: number,
  numChannels: number = 2
): Float64Array {
  const channelLength = Math.floor(buffer.length / numChannels);
  const channel = new Float64Array(channelLength);

  for (let i = 0; i < channelLength; i++) {
    channel[i] = buffer[i * numChannels + channelIndex];
  }

  return channel;
}

/**
 * Simple linear resampling (for basic use cases)
 *
 * Note: For production use, consider implementing a higher-quality
 * resampling algorithm (e.g., sinc interpolation).
 *
 * @param buffer - Input samples
 * @param originalRate - Original sample rate
 * @param targetRate - Target sample rate
 * @returns Resampled audio
 *
 * @example
 * ```typescript
 * const audio48k = new Float64Array(48000); // 1 second at 48kHz
 * const audio44k = resample(audio48k, 48000, 44100);
 * console.log(audio44k.length); // ~44100
 * ```
 */
export function resample(
  buffer: SampleBuffer,
  originalRate: number,
  targetRate: number
): Float64Array {
  if (originalRate === targetRate) {
    return Float64Array.from(buffer);
  }

  const ratio = originalRate / targetRate;
  const outputLength = Math.floor(buffer.length / ratio);
  const output = new Float64Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const index0 = Math.floor(srcIndex);
    const index1 = Math.min(index0 + 1, buffer.length - 1);
    const fraction = srcIndex - index0;

    // Linear interpolation
    output[i] = buffer[index0] * (1 - fraction) + buffer[index1] * fraction;
  }

  return output;
}

/**
 * Normalize audio to peak amplitude
 *
 * Scales the audio so the maximum absolute value equals the target peak.
 *
 * @param buffer - Input samples
 * @param targetPeak - Target peak amplitude (default: 1.0)
 * @returns Normalized audio
 *
 * @example
 * ```typescript
 * const audio = new Float64Array([0.1, 0.2, -0.3, 0.15]);
 * const normalized = normalize(audio, 1.0);
 * console.log(Math.max(...normalized)); // 1.0
 * ```
 */
export function normalize(
  buffer: SampleBuffer,
  targetPeak: number = 1.0
): Float64Array {
  const output = new Float64Array(buffer.length);

  // Find current peak
  let currentPeak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const absValue = Math.abs(buffer[i]);
    if (absValue > currentPeak) {
      currentPeak = absValue;
    }
  }

  // Avoid division by zero
  if (currentPeak === 0) {
    return output; // Return silence
  }

  // Scale to target peak
  const scale = targetPeak / currentPeak;
  for (let i = 0; i < buffer.length; i++) {
    output[i] = buffer[i] * scale;
  }

  return output;
}

/**
 * Trim silence from the beginning and end of audio
 *
 * @param buffer - Input samples
 * @param threshold - Silence threshold (default: 0.01)
 * @returns Trimmed audio and trim indices
 *
 * @example
 * ```typescript
 * const audio = new Float64Array([0, 0.001, 0.5, 0.7, 0.002, 0]);
 * const { trimmed, startIndex, endIndex } = trimSilence(audio, 0.01);
 * console.log(trimmed); // [0.5, 0.7]
 * ```
 */
export function trimSilence(
  buffer: SampleBuffer,
  threshold: number = 0.01
): { trimmed: Float64Array; startIndex: number; endIndex: number } {
  let startIndex = 0;
  let endIndex = buffer.length - 1;

  // Find start of non-silence
  for (let i = 0; i < buffer.length; i++) {
    if (Math.abs(buffer[i]) > threshold) {
      startIndex = i;
      break;
    }
  }

  // Find end of non-silence
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (Math.abs(buffer[i]) > threshold) {
      endIndex = i;
      break;
    }
  }

  // Extract trimmed region
  const length = Math.max(0, endIndex - startIndex + 1);
  const trimmed = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    trimmed[i] = buffer[startIndex + i];
  }

  return { trimmed, startIndex, endIndex };
}

/**
 * Apply fade in/out to audio
 *
 * @param buffer - Input samples
 * @param fadeInSamples - Number of samples for fade in
 * @param fadeOutSamples - Number of samples for fade out
 * @returns Audio with fades applied
 *
 * @example
 * ```typescript
 * const audio = new Float64Array(44100); // 1 second
 * const faded = applyFade(audio, 4410, 4410); // 100ms fade in/out
 * ```
 */
export function applyFade(
  buffer: SampleBuffer,
  fadeInSamples: number,
  fadeOutSamples: number
): Float64Array {
  const output = new Float64Array(buffer.length);

  for (let i = 0; i < buffer.length; i++) {
    let gain = 1.0;

    // Fade in (linear)
    if (i < fadeInSamples) {
      gain = i / fadeInSamples;
    }

    // Fade out (linear)
    if (i >= buffer.length - fadeOutSamples) {
      const fadeOutPosition = buffer.length - i;
      gain = Math.min(gain, fadeOutPosition / fadeOutSamples);
    }

    output[i] = buffer[i] * gain;
  }

  return output;
}

/**
 * React Native / Expo integration example
 *
 * This is an example of how to integrate with expo-av for audio loading.
 * You can adapt this to your specific needs.
 *
 * @example
 * ```typescript
 * // Example integration with expo-av
 * import { Audio } from 'expo-av';
 * import * as FileSystem from 'expo-file-system';
 *
 * async function loadAndAnalyzeAudio(uri: string) {
 *   // 1. Load audio with expo-av
 *   const { sound } = await Audio.Sound.createAsync({ uri });
 *   const status = await sound.getStatusAsync();
 *
 *   if (status.isLoaded) {
 *     // 2. Get audio info
 *     const duration = status.durationMillis / 1000;
 *
 *     // 3. For PCM data extraction, you might need to use native modules
 *     // or export to a WAV file and read it
 *
 *     // 4. Once you have PCM data as ArrayBuffer:
 *     const audioData = decodePCM(pcmBuffer, {
 *       sampleRate: 44100,
 *       channels: 2,
 *       bitDepth: 16
 *     });
 *
 *     // 5. Convert to mono if needed
 *     const mono = stereoToMono(audioData.samples);
 *
 *     // 6. Analyze with dsp.js
 *     const tempo = detectTempo(mono, { sampleRate: 44100 });
 *     const key = detectKey(mono, 44100);
 *     const metrics = analyzeAudioMetrics(mono, 44100);
 *
 *     console.log({ tempo, key, metrics });
 *   }
 * }
 * ```
 */
export const EXPO_INTEGRATION_GUIDE = {
  note: 'See audio-loader.ts for integration examples with expo-av',
  requiredPackages: ['expo-av', 'expo-file-system'],
  installation: 'npx expo install expo-av expo-file-system'
} as const;
