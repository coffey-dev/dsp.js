/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Reverb effect
 */

import { SingleDelay, MultiDelay } from './delays.js';
import { IIRFilter2 } from './filters.js';
import { FilterType, Channel } from './constants.js';
import { deinterleave, interleave } from './utils.js';
import type { SampleBuffer } from './types.js';

/**
 * Reverb - Reverb effect using multiple delays and filters
 */
export class Reverb {
  public delayInSamples: number;
  public masterVolume: number;
  public mixVolume: number;
  public delayVolume: number;
  public dampFrequency: number;
  public readonly NR_OF_MULTIDELAYS = 6;
  public readonly NR_OF_SINGLEDELAYS = 6;

  private LOWPASSL: IIRFilter2;
  private LOWPASSR: IIRFilter2;
  private singleDelays: SingleDelay[];
  private multiDelays: MultiDelay[];

  /**
   * @param maxDelayInSamplesSize - Maximum delay buffer size
   * @param delayInSamples - Base delay in samples
   * @param masterVolume - Master volume
   * @param mixVolume - Reverb mix volume
   * @param delayVolume - Feedback volume
   * @param dampFrequency - Low pass filter frequency
   */
  constructor(
    maxDelayInSamplesSize: number,
    delayInSamples: number,
    masterVolume: number,
    mixVolume: number,
    delayVolume: number,
    dampFrequency: number
  ) {
    this.delayInSamples = delayInSamples;
    this.masterVolume = masterVolume;
    this.mixVolume = mixVolume;
    this.delayVolume = delayVolume;
    this.dampFrequency = dampFrequency;

    this.LOWPASSL = new IIRFilter2(FilterType.LOWPASS, dampFrequency, 0, 44100);
    this.LOWPASSR = new IIRFilter2(FilterType.LOWPASS, dampFrequency, 0, 44100);

    this.singleDelays = [];
    for (let i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
      const delayMultiply = 1.0 + i / 7.0;
      this.singleDelays[i] = new SingleDelay(
        maxDelayInSamplesSize,
        Math.round(this.delayInSamples * delayMultiply),
        this.delayVolume
      );
    }

    this.multiDelays = [];
    for (let i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
      const delayMultiply = 1.0 + i / 10.0;
      this.multiDelays[i] = new MultiDelay(
        maxDelayInSamplesSize,
        Math.round(this.delayInSamples * delayMultiply),
        this.masterVolume,
        this.delayVolume
      );
    }
  }

  setDelayInSamples(delayInSamples: number): void {
    this.delayInSamples = delayInSamples;

    for (let i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
      const delayMultiply = 1.0 + i / 7.0;
      this.singleDelays[i].setDelayInSamples(Math.round(this.delayInSamples * delayMultiply));
    }

    for (let i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
      const delayMultiply = 1.0 + i / 10.0;
      this.multiDelays[i].setDelayInSamples(Math.round(this.delayInSamples * delayMultiply));
    }
  }

  setMasterVolume(masterVolume: number): void {
    this.masterVolume = masterVolume;
  }

  setMixVolume(mixVolume: number): void {
    this.mixVolume = mixVolume;
  }

  setDelayVolume(delayVolume: number): void {
    this.delayVolume = delayVolume;

    for (let i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
      this.singleDelays[i].setDelayVolume(this.delayVolume);
    }

    for (let i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
      this.multiDelays[i].setDelayVolume(this.delayVolume);
    }
  }

  setDampFrequency(dampFrequency: number): void {
    this.dampFrequency = dampFrequency;
    this.LOWPASSL.set(dampFrequency, 0);
    this.LOWPASSR.set(dampFrequency, 0);
  }

  /**
   * Process interleaved stereo buffer
   * @param interleavedSamples - Stereo interleaved input
   * @returns Processed interleaved output
   */
  process(interleavedSamples: SampleBuffer): Float64Array {
    const outputSamples = new Float64Array(interleavedSamples.length);

    // Low pass filter on input
    const leftChannel = deinterleave(Channel.LEFT, interleavedSamples);
    const rightChannel = deinterleave(Channel.RIGHT, interleavedSamples);
    this.LOWPASSL.process(leftChannel);
    this.LOWPASSR.process(rightChannel);
    const filteredSamples = interleave(leftChannel, rightChannel);

    // Process MultiDelays in parallel
    for (let i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
      const processed = this.multiDelays[i].process(filteredSamples);
      for (let j = 0; j < outputSamples.length; j++) {
        outputSamples[j] += (i % 2 === 0 ? -processed[j] : processed[j]) / this.NR_OF_MULTIDELAYS;
      }
    }

    // Process SingleDelays in series
    const singleDelaySamples = new Float64Array(outputSamples.length);
    for (let i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
      const processed = this.singleDelays[i].process(outputSamples);
      for (let j = 0; j < singleDelaySamples.length; j++) {
        singleDelaySamples[j] += (i % 2 === 0 ? -processed[j] : processed[j]);
      }
    }

    // Apply reverb mix volume and mix with original
    const result = new Float64Array(outputSamples.length);
    for (let i = 0; i < result.length; i++) {
      result[i] = (singleDelaySamples[i] * this.mixVolume + interleavedSamples[i]) * this.masterVolume;
    }

    return result;
  }
}
