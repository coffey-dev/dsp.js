/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Delay effects
 */

import type { SampleBuffer } from './types.js';

/**
 * MultiDelay - Delay with feedback (CombFilter)
 */
export class MultiDelay {
  private delayBufferSamples: Float64Array;
  private delayInputPointer: number;
  private delayOutputPointer: number;
  public delayInSamples: number;
  public masterVolume: number;
  public delayVolume: number;

  /**
   * @param maxDelayInSamplesSize - Maximum delay buffer size
   * @param delayInSamples - Initial delay in samples
   * @param masterVolume - Master volume (0.0 - 1.0+)
   * @param delayVolume - Feedback volume (0.0 - 1.0+)
   */
  constructor(
    maxDelayInSamplesSize: number,
    delayInSamples: number,
    masterVolume: number,
    delayVolume: number
  ) {
    this.delayBufferSamples = new Float64Array(maxDelayInSamplesSize);
    this.delayInputPointer = delayInSamples;
    this.delayOutputPointer = 0;
    this.delayInSamples = delayInSamples;
    this.masterVolume = masterVolume;
    this.delayVolume = delayVolume;
  }

  setDelayInSamples(delayInSamples: number): void {
    this.delayInSamples = delayInSamples;
    this.delayInputPointer = this.delayOutputPointer + delayInSamples;

    if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
      this.delayInputPointer = this.delayInputPointer - this.delayBufferSamples.length;
    }
  }

  setMasterVolume(masterVolume: number): void {
    this.masterVolume = masterVolume;
  }

  setDelayVolume(delayVolume: number): void {
    this.delayVolume = delayVolume;
  }

  /**
   * Process samples with delay and feedback
   * @param samples - Input samples
   * @returns Processed samples
   */
  process(samples: SampleBuffer): Float64Array {
    const outputSamples = new Float64Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      const delaySample = this.delayBufferSamples[this.delayOutputPointer] || 0;
      const sample = delaySample * this.delayVolume + samples[i];
      this.delayBufferSamples[this.delayInputPointer] = sample;
      outputSamples[i] = sample * this.masterVolume;

      this.delayInputPointer++;
      if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
        this.delayInputPointer = 0;
      }

      this.delayOutputPointer++;
      if (this.delayOutputPointer >= this.delayBufferSamples.length - 1) {
        this.delayOutputPointer = 0;
      }
    }

    return outputSamples;
  }
}

/**
 * SingleDelay - Simple delay without feedback
 */
export class SingleDelay {
  private delayBufferSamples: Float64Array;
  private delayInputPointer: number;
  private delayOutputPointer: number;
  public delayInSamples: number;
  public delayVolume: number;

  /**
   * @param maxDelayInSamplesSize - Maximum delay buffer size
   * @param delayInSamples - Initial delay in samples
   * @param delayVolume - Delay volume (0.0 - 1.0+)
   */
  constructor(maxDelayInSamplesSize: number, delayInSamples: number, delayVolume: number) {
    this.delayBufferSamples = new Float64Array(maxDelayInSamplesSize);
    this.delayInputPointer = delayInSamples;
    this.delayOutputPointer = 0;
    this.delayInSamples = delayInSamples;
    this.delayVolume = delayVolume;
  }

  setDelayInSamples(delayInSamples: number): void {
    this.delayInSamples = delayInSamples;
    this.delayInputPointer = this.delayOutputPointer + delayInSamples;

    if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
      this.delayInputPointer = this.delayInputPointer - this.delayBufferSamples.length;
    }
  }

  setDelayVolume(delayVolume: number): void {
    this.delayVolume = delayVolume;
  }

  /**
   * Process samples with delay only (no feedback)
   * @param samples - Input samples
   * @returns Delayed samples
   */
  process(samples: SampleBuffer): Float64Array {
    const outputSamples = new Float64Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      this.delayBufferSamples[this.delayInputPointer] = samples[i];
      const delaySample = this.delayBufferSamples[this.delayOutputPointer];
      outputSamples[i] = delaySample * this.delayVolume;

      this.delayInputPointer++;
      if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
        this.delayInputPointer = 0;
      }

      this.delayOutputPointer++;
      if (this.delayOutputPointer >= this.delayBufferSamples.length - 1) {
        this.delayOutputPointer = 0;
      }
    }

    return outputSamples;
  }
}
