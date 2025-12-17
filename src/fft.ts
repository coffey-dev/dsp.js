/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Fast Fourier Transform (FFT)
 */

import { FourierTransform } from './fourier-transform.js';
import type { SampleBuffer } from './types.js';

/**
 * FFT - Fast Fourier Transform
 * Calculates the Discrete Fourier Transform using the FFT algorithm
 */
export class FFT extends FourierTransform {
  private reverseTable: Uint32Array;
  private sinTable: Float64Array;
  private cosTable: Float64Array;

  /**
   * @param bufferSize - The size of the sample buffer (must be power of 2)
   * @param sampleRate - The sample rate of the buffer (e.g., 44100)
   */
  constructor(bufferSize: number, sampleRate: number) {
    super(bufferSize, sampleRate);

    this.reverseTable = new Uint32Array(bufferSize);

    let limit = 1;
    let bit = bufferSize >> 1;
    let i: number;

    while (limit < bufferSize) {
      for (i = 0; i < limit; i++) {
        this.reverseTable[i + limit] = this.reverseTable[i] + bit;
      }
      limit = limit << 1;
      bit = bit >> 1;
    }

    this.sinTable = new Float64Array(bufferSize);
    this.cosTable = new Float64Array(bufferSize);

    for (i = 0; i < bufferSize; i++) {
      this.sinTable[i] = Math.sin(-Math.PI / i);
      this.cosTable[i] = Math.cos(-Math.PI / i);
    }
  }

  /**
   * Performs a forward transform on the sample buffer
   * Converts a time domain signal to frequency domain spectra
   * @param buffer - The sample buffer (length must be power of 2)
   */
  forward(buffer: SampleBuffer): void {
    const bufferSize = this.bufferSize;
    const cosTable = this.cosTable;
    const sinTable = this.sinTable;
    const reverseTable = this.reverseTable;
    const real = this.real;
    const imag = this.imag;

    const k = Math.floor(Math.log(bufferSize) / Math.LN2);

    if (Math.pow(2, k) !== bufferSize) {
      throw new Error('Invalid buffer size, must be a power of 2.');
    }
    if (bufferSize !== buffer.length) {
      throw new Error(
        `Supplied buffer is not the same size as defined FFT. FFT Size: ${bufferSize} Buffer Size: ${buffer.length}`
      );
    }

    let halfSize = 1;
    let phaseShiftStepReal: number;
    let phaseShiftStepImag: number;
    let currentPhaseShiftReal: number;
    let currentPhaseShiftImag: number;
    let off: number;
    let tr: number;
    let ti: number;
    let tmpReal: number;
    let i: number;

    for (i = 0; i < bufferSize; i++) {
      real[i] = buffer[reverseTable[i]];
      imag[i] = 0;
    }

    while (halfSize < bufferSize) {
      phaseShiftStepReal = cosTable[halfSize];
      phaseShiftStepImag = sinTable[halfSize];

      currentPhaseShiftReal = 1;
      currentPhaseShiftImag = 0;

      for (let fftStep = 0; fftStep < halfSize; fftStep++) {
        i = fftStep;

        while (i < bufferSize) {
          off = i + halfSize;
          tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
          ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];

          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;

          i += halfSize << 1;
        }

        tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal =
          tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
        currentPhaseShiftImag =
          tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
      }

      halfSize = halfSize << 1;
    }

    this.calculateSpectrum();
  }

  /**
   * Performs an inverse transform
   * @param real - Real component array (optional, uses internal if not provided)
   * @param imag - Imaginary component array (optional, uses internal if not provided)
   * @returns The time domain signal
   */
  inverse(real?: Float64Array, imag?: Float64Array): Float64Array {
    const bufferSize = this.bufferSize;
    const cosTable = this.cosTable;
    const sinTable = this.sinTable;
    const reverseTable = this.reverseTable;

    real = real || this.real;
    imag = imag || this.imag;

    let halfSize = 1;
    let phaseShiftStepReal: number;
    let phaseShiftStepImag: number;
    let currentPhaseShiftReal: number;
    let currentPhaseShiftImag: number;
    let off: number;
    let tr: number;
    let ti: number;
    let tmpReal: number;
    let i: number;

    for (i = 0; i < bufferSize; i++) {
      imag[i] *= -1;
    }

    const revReal = new Float64Array(bufferSize);
    const revImag = new Float64Array(bufferSize);

    for (i = 0; i < real.length; i++) {
      revReal[i] = real[reverseTable[i]];
      revImag[i] = imag[reverseTable[i]];
    }

    real = revReal;
    imag = revImag;

    while (halfSize < bufferSize) {
      phaseShiftStepReal = cosTable[halfSize];
      phaseShiftStepImag = sinTable[halfSize];
      currentPhaseShiftReal = 1;
      currentPhaseShiftImag = 0;

      for (let fftStep = 0; fftStep < halfSize; fftStep++) {
        i = fftStep;

        while (i < bufferSize) {
          off = i + halfSize;
          tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
          ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];

          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;

          i += halfSize << 1;
        }

        tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal =
          tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
        currentPhaseShiftImag =
          tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
      }

      halfSize = halfSize << 1;
    }

    const buffer = new Float64Array(bufferSize);
    for (i = 0; i < bufferSize; i++) {
      buffer[i] = real[i] / bufferSize;
    }

    return buffer;
  }
}
