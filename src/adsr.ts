/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * ADSR Envelope Generator
 */

import type { SampleBuffer } from './types.js';

/**
 * ADSR - Attack Decay Sustain Release envelope
 */
export class ADSR {
  public sampleRate: number;
  public attackLength: number;
  public decayLength: number;
  public sustainLevel: number;
  public sustainLength: number;
  public releaseLength: number;
  public attackSamples: number;
  public decaySamples: number;
  public sustainSamples: number;
  public releaseSamples: number;
  public attack: number;
  public decay: number;
  public sustain: number;
  public release: number;
  public samplesProcessed: number;

  /**
   * @param attackLength - Attack time in seconds
   * @param decayLength - Decay time in seconds
   * @param sustainLevel - Sustain level (0-1)
   * @param sustainLength - Sustain time in seconds
   * @param releaseLength - Release time in seconds
   * @param sampleRate - Sample rate
   */
  constructor(
    attackLength: number,
    decayLength: number,
    sustainLevel: number,
    sustainLength: number,
    releaseLength: number,
    sampleRate: number
  ) {
    this.sampleRate = sampleRate;
    this.attackLength = attackLength;
    this.decayLength = decayLength;
    this.sustainLevel = sustainLevel;
    this.sustainLength = sustainLength;
    this.releaseLength = releaseLength;

    this.attackSamples = attackLength * sampleRate;
    this.decaySamples = decayLength * sampleRate;
    this.sustainSamples = sustainLength * sampleRate;
    this.releaseSamples = releaseLength * sampleRate;

    this.attack = 0;
    this.decay = 0;
    this.sustain = 0;
    this.release = 0;
    this.samplesProcessed = 0;

    this.update();
  }

  /**
   * Updates the envelope sample positions
   */
  private update(): void {
    this.attack = this.attackSamples;
    this.decay = this.attack + this.decaySamples;
    this.sustain = this.decay + this.sustainSamples;
    this.release = this.sustain + this.releaseSamples;
  }

  /**
   * Trigger note on
   */
  noteOn(): void {
    this.samplesProcessed = 0;
    this.sustainSamples = this.sustainLength * this.sampleRate;
    this.update();
  }

  /**
   * Trigger note off (for infinite sustain)
   */
  noteOff(): void {
    this.sustainSamples = this.samplesProcessed - this.decaySamples;
    this.update();
  }

  /**
   * Process a single sample
   * @param sample - The input sample
   * @returns The processed sample
   */
  processSample(sample: number): number {
    return sample * this.value();
  }

  /**
   * Get the current envelope value
   * @returns The envelope amplitude (0-1)
   */
  value(): number {
    let amplitude = 0;

    if (this.samplesProcessed <= this.attack) {
      amplitude = (this.samplesProcessed - 0) / (this.attack - 0);
    } else if (this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay) {
      amplitude =
        1 +
        (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
    } else if (this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain) {
      amplitude = this.sustainLevel;
    } else if (this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release) {
      amplitude =
        this.sustainLevel +
        (0 - this.sustainLevel) *
          ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
    }

    return amplitude;
  }

  /**
   * Process a buffer of samples
   * @param buffer - The sample buffer
   * @returns The processed buffer
   */
  process(buffer: SampleBuffer): SampleBuffer {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] *= this.value();
      this.samplesProcessed++;
    }
    return buffer;
  }

  /**
   * Check if envelope is active
   * @returns True if active
   */
  isActive(): boolean {
    return !(this.samplesProcessed > this.release || this.samplesProcessed === -1);
  }

  /**
   * Disable the envelope
   */
  disable(): void {
    this.samplesProcessed = -1;
  }
}
