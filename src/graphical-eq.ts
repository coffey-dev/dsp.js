/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Graphical Equalizer
 */

import { Biquad } from './biquad.js';
import { BiquadFilterType } from './constants.js';
import { mag2db, freqz } from './utils.js';
import type { SampleBuffer } from './types.js';

/**
 * GraphicalEq - Graphic equalizer with configurable bands
 */
export class GraphicalEq {
  public FS: number;
  public minFreq: number;
  public maxFreq: number;
  public bandsPerOctave: number;
  public calculateFreqzs: boolean;
  public filters: Biquad[];
  public freqzs: Float64Array[];
  private w?: Float64Array;

  /**
   * @param sampleRate - Sample rate
   */
  constructor(sampleRate: number) {
    this.FS = sampleRate;
    this.minFreq = 40.0;
    this.maxFreq = 16000.0;
    this.bandsPerOctave = 1.0;
    this.filters = [];
    this.freqzs = [];
    this.calculateFreqzs = true;
    this.recalculateFilters();
  }

  private recalculateFilters(): void {
    const bandCount = Math.round(
      (Math.log(this.maxFreq / this.minFreq) * this.bandsPerOctave) / Math.LN2
    );

    this.filters = [];
    for (let i = 0; i < bandCount; i++) {
      const freq = this.minFreq * Math.pow(2, i / this.bandsPerOctave);
      const newFilter = new Biquad(BiquadFilterType.PEAKING_EQ, this.FS);
      newFilter.setDbGain(0);
      newFilter.setBW(1 / this.bandsPerOctave);
      newFilter.setF0(freq);
      this.filters[i] = newFilter;
      this.recalculateFreqz(i);
    }
  }

  setMinimumFrequency(freq: number): void {
    this.minFreq = freq;
    this.recalculateFilters();
  }

  setMaximumFrequency(freq: number): void {
    this.maxFreq = freq;
    this.recalculateFilters();
  }

  setBandsPerOctave(bands: number): void {
    this.bandsPerOctave = bands;
    this.recalculateFilters();
  }

  setBandGain(bandIndex: number, gain: number): void {
    if (bandIndex < 0 || bandIndex > this.filters.length - 1) {
      throw new Error('The band index of the graphical equalizer is out of bounds.');
    }

    if (gain === undefined) {
      throw new Error('A gain must be passed.');
    }

    this.filters[bandIndex].setDbGain(gain);
    this.recalculateFreqz(bandIndex);
  }

  private recalculateFreqz(bandIndex: number): void {
    if (!this.calculateFreqzs) {
      return;
    }

    if (bandIndex < 0 || bandIndex > this.filters.length - 1) {
      throw new Error(
        `The band index of the graphical equalizer is out of bounds. ${bandIndex} is out of [0, ${
          this.filters.length - 1
        }]`
      );
    }

    if (!this.w) {
      this.w = new Float64Array(400);
      for (let i = 0; i < this.w.length; i++) {
        this.w[i] = (Math.PI / this.w.length) * i;
      }
    }

    const b = [this.filters[bandIndex].b0, this.filters[bandIndex].b1, this.filters[bandIndex].b2];
    const a = [this.filters[bandIndex].a0, this.filters[bandIndex].a1, this.filters[bandIndex].a2];

    this.freqzs[bandIndex] = mag2db(freqz(b, a, this.w));
  }

  /**
   * Process mono buffer
   * @param buffer - Input buffer
   * @returns Processed buffer
   */
  process(buffer: SampleBuffer): Float64Array {
    let output: Float64Array = new Float64Array(buffer);

    for (let i = 0; i < this.filters.length; i++) {
      output = this.filters[i].process(output);
    }

    return output;
  }

  /**
   * Process stereo interleaved buffer
   * @param buffer - Interleaved stereo buffer
   * @returns Processed interleaved buffer
   */
  processStereo(buffer: SampleBuffer): Float64Array {
    let output: Float64Array = new Float64Array(buffer);

    for (let i = 0; i < this.filters.length; i++) {
      output = this.filters[i].processStereo(output);
    }

    return output;
  }
}
