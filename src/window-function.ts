/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Window Functions
 */

import { TWO_PI, WindowFunction as WindowFunctionType } from './constants.js';
import type { SampleBuffer } from './types.js';

type WindowFunctionImpl = (length: number, index: number, alpha?: number) => number;

/**
 * Window function implementations
 */
export const WindowFunctions = {
  Bartlett: (length: number, index: number): number =>
    (2 / (length - 1)) * ((length - 1) / 2 - Math.abs(index - (length - 1) / 2)),

  BartlettHann: (length: number, index: number): number =>
    0.62 - 0.48 * Math.abs(index / (length - 1) - 0.5) - 0.38 * Math.cos(TWO_PI * index / (length - 1)),

  Blackman: (length: number, index: number, alpha = 0.16): number => {
    const a0 = (1 - alpha) / 2;
    const a1 = 0.5;
    const a2 = alpha / 2;
    return a0 - a1 * Math.cos(TWO_PI * index / (length - 1)) + a2 * Math.cos((4 * Math.PI * index) / (length - 1));
  },

  Cosine: (length: number, index: number): number => Math.cos((Math.PI * index) / (length - 1) - Math.PI / 2),

  Gauss: (length: number, index: number, alpha = 0.25): number =>
    Math.pow(Math.E, -0.5 * Math.pow((index - (length - 1) / 2) / (alpha * (length - 1) / 2), 2)),

  Hamming: (length: number, index: number): number => 0.54 - 0.46 * Math.cos(TWO_PI * index / (length - 1)),

  Hann: (length: number, index: number): number => 0.5 * (1 - Math.cos(TWO_PI * index / (length - 1))),

  Lanczos: (length: number, index: number): number => {
    const x = (2 * index) / (length - 1) - 1;
    return Math.sin(Math.PI * x) / (Math.PI * x);
  },

  Rectangular: (_length: number, _index: number): number => 1,

  Triangular: (length: number, index: number): number =>
    (2 / length) * (length / 2 - Math.abs(index - (length - 1) / 2)),
};

/**
 * Window Function class
 */
export class WindowFunction {
  private func: WindowFunctionImpl;
  public alpha?: number;

  /**
   * @param type - Window function type
   * @param alpha - Optional alpha parameter for certain window functions
   */
  constructor(type: WindowFunctionType, alpha?: number) {
    this.alpha = alpha;

    switch (type) {
      case WindowFunctionType.BARTLETT:
        this.func = WindowFunctions.Bartlett;
        break;
      case WindowFunctionType.BARTLETTHANN:
        this.func = WindowFunctions.BartlettHann;
        break;
      case WindowFunctionType.BLACKMAN:
        this.func = WindowFunctions.Blackman;
        this.alpha = this.alpha || 0.16;
        break;
      case WindowFunctionType.COSINE:
        this.func = WindowFunctions.Cosine;
        break;
      case WindowFunctionType.GAUSS:
        this.func = WindowFunctions.Gauss;
        this.alpha = this.alpha || 0.25;
        break;
      case WindowFunctionType.HAMMING:
        this.func = WindowFunctions.Hamming;
        break;
      case WindowFunctionType.HANN:
        this.func = WindowFunctions.Hann;
        break;
      case WindowFunctionType.LANCZOS:
        this.func = WindowFunctions.Lanczos;
        break;
      case WindowFunctionType.RECTANGULAR:
        this.func = WindowFunctions.Rectangular;
        break;
      case WindowFunctionType.TRIANGULAR:
        this.func = WindowFunctions.Triangular;
        break;
      default:
        this.func = WindowFunctions.Rectangular;
    }
  }

  /**
   * Process a buffer with the window function
   * @param buffer - Sample buffer
   * @returns The processed buffer
   */
  process(buffer: SampleBuffer): SampleBuffer {
    const length = buffer.length;
    for (let i = 0; i < length; i++) {
      buffer[i] *= this.func(length, i, this.alpha);
    }
    return buffer;
  }
}

/**
 * Hyperbolic sine function
 * @param arg - Input value
 * @returns sinh(arg)
 */
export function sinh(arg: number): number {
  return (Math.exp(arg) - Math.exp(-arg)) / 2;
}
