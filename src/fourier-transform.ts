/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Fourier Transform base class
 */

/**
 * Base class for Fourier Transform implementations
 */
export class FourierTransform {
  public bufferSize: number;
  public sampleRate: number;
  public bandwidth: number;
  public spectrum: Float64Array;
  public real: Float64Array;
  public imag: Float64Array;
  public peakBand: number;
  public peak: number;

  constructor(bufferSize: number, sampleRate: number) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bandwidth = (2 / bufferSize) * (sampleRate / 2);

    this.spectrum = new Float64Array(bufferSize / 2);
    this.real = new Float64Array(bufferSize);
    this.imag = new Float64Array(bufferSize);

    this.peakBand = 0;
    this.peak = 0;
  }

  /**
   * Calculates the middle frequency of an FFT band
   * @param index - The index of the FFT band
   * @returns The middle frequency in Hz
   */
  getBandFrequency(index: number): number {
    return this.bandwidth * index + this.bandwidth / 2;
  }

  /**
   * Calculates the spectrum from real and imaginary components
   */
  calculateSpectrum(): void {
    const spectrum = this.spectrum;
    const real = this.real;
    const imag = this.imag;
    const bSi = 2 / this.bufferSize;
    const sqrt = Math.sqrt;

    for (let i = 0, N = this.bufferSize / 2; i < N; i++) {
      const rval = real[i];
      const ival = imag[i];
      const mag = bSi * sqrt(rval * rval + ival * ival);

      if (mag > this.peak) {
        this.peakBand = i;
        this.peak = mag;
      }

      spectrum[i] = mag;
    }
  }
}
