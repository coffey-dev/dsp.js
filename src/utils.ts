/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Utility functions for DSP operations
 */

import type { SampleBuffer, Channel } from './types.js';
import { Channel as ChannelEnum } from './constants.js';

/**
 * Inverts the phase of a signal
 * @param buffer - A sample buffer
 * @returns The inverted sample buffer
 */
export function invert(buffer: SampleBuffer): SampleBuffer {
  for (let i = 0, len = buffer.length; i < len; i++) {
    buffer[i] *= -1;
  }
  return buffer;
}

/**
 * Converts split-stereo (dual mono) sample buffers into a stereo interleaved sample buffer
 * @param left - Left channel sample buffer
 * @param right - Right channel sample buffer
 * @returns The stereo interleaved buffer
 */
export function interleave(left: SampleBuffer, right: SampleBuffer): Float64Array {
  if (left.length !== right.length) {
    throw new Error('Cannot interleave. Channel lengths differ.');
  }

  const stereoInterleaved = new Float64Array(left.length * 2);

  for (let i = 0, len = left.length; i < len; i++) {
    stereoInterleaved[2 * i] = left[i];
    stereoInterleaved[2 * i + 1] = right[i];
  }

  return stereoInterleaved;
}

/**
 * Converts a stereo-interleaved sample buffer into split-stereo (dual mono) sample buffers
 */
export const deinterleave = (() => {
  let left: Float64Array;
  let right: Float64Array;
  let mix: Float64Array;

  const deinterleaveChannel: Record<Channel, (buffer: SampleBuffer) => Float64Array> = {
    [ChannelEnum.MIX]: (buffer: SampleBuffer) => {
      for (let i = 0, len = buffer.length / 2; i < len; i++) {
        mix[i] = (buffer[2 * i] + buffer[2 * i + 1]) / 2;
      }
      return mix;
    },
    [ChannelEnum.LEFT]: (buffer: SampleBuffer) => {
      for (let i = 0, len = buffer.length / 2; i < len; i++) {
        left[i] = buffer[2 * i];
      }
      return left;
    },
    [ChannelEnum.RIGHT]: (buffer: SampleBuffer) => {
      for (let i = 0, len = buffer.length / 2; i < len; i++) {
        right[i] = buffer[2 * i + 1];
      }
      return right;
    },
  };

  return function (channel: Channel, buffer: SampleBuffer): Float64Array {
    left = left || new Float64Array(buffer.length / 2);
    right = right || new Float64Array(buffer.length / 2);
    mix = mix || new Float64Array(buffer.length / 2);

    if (buffer.length / 2 !== left.length) {
      left = new Float64Array(buffer.length / 2);
      right = new Float64Array(buffer.length / 2);
      mix = new Float64Array(buffer.length / 2);
    }

    return deinterleaveChannel[channel](buffer);
  };
})();

/**
 * Separates a channel from a stereo-interleaved sample buffer
 * @param channel - Channel to extract
 * @param buffer - Stereo-interleaved sample buffer
 * @returns A mono sample buffer
 */
export const getChannel = deinterleave;

/**
 * Mix two (interleaved) sample buffers
 * @param sampleBuffer1 - First sample buffer
 * @param sampleBuffer2 - Second sample buffer
 * @param negate - When true inverts/flips the audio signal
 * @param volumeCorrection - Volume correction factor
 * @returns A new interleaved buffer
 */
export function mixSampleBuffers(
  sampleBuffer1: SampleBuffer,
  sampleBuffer2: SampleBuffer,
  negate: boolean,
  volumeCorrection: number
): Float64Array {
  const outputSamples = new Float64Array(sampleBuffer1);

  for (let i = 0; i < sampleBuffer1.length; i++) {
    outputSamples[i] += (negate ? -sampleBuffer2[i] : sampleBuffer2[i]) / volumeCorrection;
  }

  return outputSamples;
}

/**
 * Find RMS (Root Mean Square) of signal
 * @param buffer - Sample buffer
 * @returns RMS value
 */
export function RMS(buffer: SampleBuffer): number {
  let total = 0;
  const n = buffer.length;

  for (let i = 0; i < n; i++) {
    total += buffer[i] * buffer[i];
  }

  return Math.sqrt(total / n);
}

/**
 * Find peak value of signal
 * @param buffer - Sample buffer
 * @returns Peak value
 */
export function peak(buffer: SampleBuffer): number {
  let peakValue = 0;

  for (let i = 0, n = buffer.length; i < n; i++) {
    peakValue = Math.abs(buffer[i]) > peakValue ? Math.abs(buffer[i]) : peakValue;
  }

  return peakValue;
}

/**
 * Convert magnitude to decibels (single value)
 * @param magnitude - Magnitude value
 * @returns Value in decibels
 */
export function mag2dbSingle(magnitude: number): number {
  return 20 * Math.log10(magnitude);
}

/**
 * Convert magnitude buffer to decibels
 * @param buffer - Buffer of magnitude values
 * @returns Buffer in decibels
 */
export function mag2db(buffer: SampleBuffer | Float64Array): Float64Array {
  const minDb = -120;
  const minMag = Math.pow(10.0, minDb / 20.0);

  const result = new Float64Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = 20.0 * Math.log(Math.max(buffer[i], minMag));
  }

  return result;
}

/**
 * Calculate frequency response at given points
 * @param b - B coefficients of the filter
 * @param a - A coefficients of the filter
 * @param w - Points where to calculate frequency response (optional)
 * @returns The frequency response in magnitude
 */
export function freqz(b: number[], a: number[], w?: Float64Array): Float64Array {
  if (!w) {
    w = new Float64Array(200);
    for (let i = 0; i < w.length; i++) {
      w[i] = (2 * Math.PI * i) / w.length - Math.PI;
    }
  }

  const result = new Float64Array(w.length);
  const sqrt = Math.sqrt;
  const cos = Math.cos;
  const sin = Math.sin;

  for (let i = 0; i < w.length; i++) {
    const numerator = { real: 0.0, imag: 0.0 };
    for (let j = 0; j < b.length; j++) {
      numerator.real += b[j] * cos(-j * w[i]);
      numerator.imag += b[j] * sin(-j * w[i]);
    }

    const denominator = { real: 0.0, imag: 0.0 };
    for (let j = 0; j < a.length; j++) {
      denominator.real += a[j] * cos(-j * w[i]);
      denominator.imag += a[j] * sin(-j * w[i]);
    }

    result[i] =
      sqrt(numerator.real * numerator.real + numerator.imag * numerator.imag) /
      sqrt(denominator.real * denominator.real + denominator.imag * denominator.imag);
  }

  return result;
}
