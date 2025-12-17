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
