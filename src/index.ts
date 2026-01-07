/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * A comprehensive digital signal processing library
 * Now in modern TypeScript with ESM support
 *
 * @module dsp.js
 */

// Export constants and enums
export {
  Channel,
  Waveform,
  FilterType,
  WindowFunction as WindowFunctionType,
  LoopMode,
  BiquadFilterType,
  BiquadParameterType,
  TWO_PI,
} from './constants.js';

// Export types
export type { SampleBuffer } from './types.js';

// Export utility functions
export * from './utils.js';

// Export Fourier Transform classes
export { FourierTransform } from './fourier-transform.js';
export { DFT } from './dft.js';
export { FFT } from './fft.js';
export { RFFT } from './rfft.js';

// Export audio generation classes
export { Oscillator, WaveformFunctions } from './oscillator.js';
export { Sampler } from './sampler.js';

// Export envelope
export { ADSR } from './adsr.js';

// Export filters
export { IIRFilter, IIRFilter2 } from './filters.js';
export { Biquad } from './biquad.js';
export { GraphicalEq } from './graphical-eq.js';

// Export window functions
export { WindowFunction, WindowFunctions, sinh } from './window-function.js';

// Export delay effects
export { MultiDelay, SingleDelay } from './delays.js';

// Export reverb
export { Reverb } from './reverb.js';

// Export audio features and analysis (librosa-inspired)
export {
  // Basic features
  getDuration,
  getZeroCrossingRate,

  // STFT and spectral analysis
  computeSTFT,
  getSpectralCentroid,
  getSpectralRolloff,
  getSpectralBandwidth,

  // Energy and loudness
  getRMSEnergy,
  getLoudness,

  // Tempo and rhythm
  detectTempo,

  // Key detection
  detectKey,
  MUSICAL_KEYS,

  // High-level metrics
  analyzeAudioMetrics,

  // Types
  type STFTOptions,
  type STFTResult,
  type SpectralOptions,
  type TempoOptions,
  type TempoResult,
  type KeyResult,
  type MusicalKey,
  type AudioMetrics,
} from './audio-features.js';

// Export audio loading utilities
export {
  // Loading functions
  loadAudioFromURI,
  decodePCM,

  // Audio processing utilities
  stereoToMono,
  extractChannel,
  resample,
  normalize,
  trimSilence,
  applyFade,

  // Integration guide
  EXPO_INTEGRATION_GUIDE,

  // Types
  type AudioInfo,
  type AudioData,
  type LoadAudioOptions,
} from './audio-loader.js';
