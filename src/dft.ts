/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Discrete Fourier Transform (DFT)
 */

import { FourierTransform } from './fourier-transform.js';
import type { SampleBuffer } from './types.js';

/**
 * DFT - Discrete Fourier Transform
 * Calculates the Discrete Fourier Transform of a signal
 */
export class DFT extends FourierTransform {
  private sinTable: Float64Array;
  private cosTable: Float64Array;

  /**
   * @param bufferSize - The size of the sample buffer to be computed
   * @param sampleRate - The sample rate of the buffer (e.g., 44100)
   */
  constructor(bufferSize: number, sampleRate: number) {
    super(bufferSize, sampleRate);

    const N = (bufferSize / 2) * bufferSize;
    const TWO_PI = 2 * Math.PI;

    this.sinTable = new Float64Array(N);
    this.cosTable = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      this.sinTable[i] = Math.sin((i * TWO_PI) / bufferSize);
      this.cosTable[i] = Math.cos((i * TWO_PI) / bufferSize);
    }
  }

  /**
   * Performs a forward transform on the sample buffer
   * Converts a time domain signal to frequency domain spectra
   * @param buffer - The sample buffer
   * @returns The frequency spectrum array
   */
  forward(buffer: SampleBuffer): void {
    const real = this.real;
    const imag = this.imag;

    for (let k = 0; k < this.bufferSize / 2; k++) {
      let rval = 0.0;
      let ival = 0.0;

      for (let n = 0; n < buffer.length; n++) {
        rval += this.cosTable[k * n] * buffer[n];
        ival += this.sinTable[k * n] * buffer[n];
      }

      real[k] = rval;
      imag[k] = ival;
    }

    this.calculateSpectrum();
  }
}
