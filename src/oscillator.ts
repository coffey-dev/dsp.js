/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Oscillator for generating waveforms
 */

import { TWO_PI, Waveform } from './constants.js';
import type { ADSR } from './adsr.js';

/**
 * Waveform generator functions
 */
export const WaveformFunctions = {
  Sine: (step: number): number => Math.sin(TWO_PI * step),
  Square: (step: number): number => (step < 0.5 ? 1 : -1),
  Saw: (step: number): number => 2 * (step - Math.round(step)),
  Triangle: (step: number): number => 1 - 4 * Math.abs(Math.round(step) - step),
  Pulse: (_step: number): number => 0, // stub
};

type WaveformFunction = (step: number) => number;

/**
 * Oscillator class for generating and modifying signals
 */
export class Oscillator {
  public frequency: number;
  public amplitude: number;
  public bufferSize: number;
  public sampleRate: number;
  public frameCount: number;
  public waveTableLength: number;
  public cyclesPerSample: number;
  public signal: Float64Array;
  public envelope: ADSR | null;
  private func: WaveformFunction;
  private waveTable: Float64Array;

  private static waveTableCache: Record<number, Float64Array> = {};

  /**
   * @param type - Waveform type
   * @param frequency - Initial frequency of the signal
   * @param amplitude - Initial amplitude of the signal
   * @param bufferSize - Size of the sample buffer to generate
   * @param sampleRate - The sample rate of the signal
   */
  constructor(
    type: Waveform,
    frequency: number,
    amplitude: number,
    bufferSize: number,
    sampleRate: number
  ) {
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.frameCount = 0;

    this.waveTableLength = 2048;
    this.cyclesPerSample = frequency / sampleRate;

    this.signal = new Float64Array(bufferSize);
    this.envelope = null;

    switch (type) {
      case Waveform.TRIANGLE:
        this.func = WaveformFunctions.Triangle;
        break;
      case Waveform.SAW:
        this.func = WaveformFunctions.Saw;
        break;
      case Waveform.SQUARE:
        this.func = WaveformFunctions.Square;
        break;
      case Waveform.SINE:
      default:
        this.func = WaveformFunctions.Sine;
        break;
    }

    // Use cached wave table or generate new one
    const funcKey = type;
    if (!Oscillator.waveTableCache[funcKey]) {
      Oscillator.waveTableCache[funcKey] = this.generateWaveTable();
    }
    this.waveTable = Oscillator.waveTableCache[funcKey];
  }

  /**
   * Generates a wave table for the current waveform
   */
  private generateWaveTable(): Float64Array {
    const table = new Float64Array(this.waveTableLength);
    const waveTableTime = this.waveTableLength / this.sampleRate;
    const waveTableHz = 1 / waveTableTime;

    for (let i = 0; i < this.waveTableLength; i++) {
      table[i] = this.func((i * waveTableHz) / this.sampleRate);
    }

    return table;
  }

  /**
   * Set the amplitude of the signal
   * @param amplitude - The amplitude (between 0 and 1)
   */
  setAmp(amplitude: number): void {
    if (amplitude >= 0 && amplitude <= 1) {
      this.amplitude = amplitude;
    } else {
      throw new Error('Amplitude out of range (0..1).');
    }
  }

  /**
   * Set the frequency of the signal
   * @param frequency - The frequency of the signal
   */
  setFreq(frequency: number): void {
    this.frequency = frequency;
    this.cyclesPerSample = frequency / this.sampleRate;
  }

  /**
   * Add another oscillator's signal to this one
   * @param oscillator - The oscillator to add
   * @returns The combined signal
   */
  add(oscillator: Oscillator): Float64Array {
    for (let i = 0; i < this.bufferSize; i++) {
      this.signal[i] += oscillator.signal[i];
    }
    return this.signal;
  }

  /**
   * Add a signal to the current generated signal
   * @param signal - The signal to add
   * @returns The combined signal
   */
  addSignal(signal: Float64Array): Float64Array {
    for (let i = 0; i < signal.length && i < this.bufferSize; i++) {
      this.signal[i] += signal[i];
    }
    return this.signal;
  }

  /**
   * Add an envelope to the oscillator
   * @param envelope - The ADSR envelope
   */
  addEnvelope(envelope: ADSR): void {
    this.envelope = envelope;
  }

  /**
   * Apply the envelope to the signal
   */
  applyEnvelope(): void {
    if (this.envelope) {
      this.envelope.process(this.signal);
    }
  }

  /**
   * Get the value at a specific offset in the wave table
   * @param offset - The offset in the wave table
   * @returns The value at that offset
   */
  valueAt(offset: number): number {
    return this.waveTable[offset % this.waveTableLength];
  }

  /**
   * Generate the next buffer of samples
   * @returns The generated signal
   */
  generate(): Float64Array {
    const frameOffset = this.frameCount * this.bufferSize;
    const step = (this.waveTableLength * this.frequency) / this.sampleRate;

    for (let i = 0; i < this.bufferSize; i++) {
      const offset = Math.round((frameOffset + i) * step);
      this.signal[i] = this.waveTable[offset % this.waveTableLength] * this.amplitude;
    }

    this.frameCount++;

    return this.signal;
  }
}
