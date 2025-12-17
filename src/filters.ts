/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * IIR Filters
 */

import { FilterType } from './constants.js';
import type { ADSR } from './adsr.js';
import type { SampleBuffer } from './types.js';

/**
 * LP12 - 12dB Low Pass Filter
 */
class LP12 {
  public sampleRate: number;
  public cutoff: number;
  public resonance: number;
  public envelope: ADSR | null = null;
  private vibraPos = 0;
  private vibraSpeed = 0;
  private w = 0;
  private q = 0;
  private r = 0;
  private c = 0;

  constructor(cutoff: number, resonance: number, sampleRate: number) {
    this.sampleRate = sampleRate;
    this.cutoff = cutoff;
    this.resonance = resonance;
    this.calcCoeff(cutoff, resonance);
  }

  calcCoeff(cutoff: number, resonance: number): void {
    this.w = (2.0 * Math.PI * cutoff) / this.sampleRate;
    this.q = 1.0 - this.w / (2.0 * (resonance + 0.5 / (1.0 + this.w)) + this.w - 2.0);
    this.r = this.q * this.q;
    this.c = this.r + 1.0 - 2.0 * Math.cos(this.w) * this.q;
    this.cutoff = cutoff;
    this.resonance = resonance;
  }

  process(buffer: SampleBuffer): void {
    for (let i = 0; i < buffer.length; i++) {
      this.vibraSpeed += (buffer[i] - this.vibraPos) * this.c;
      this.vibraPos += this.vibraSpeed;
      this.vibraSpeed *= this.r;

      if (this.envelope) {
        buffer[i] =
          buffer[i] * (1 - this.envelope.value()) + this.vibraPos * this.envelope.value();
        this.envelope.samplesProcessed++;
      } else {
        buffer[i] = this.vibraPos;
      }
    }
  }

  addEnvelope(envelope: ADSR): void {
    this.envelope = envelope;
  }
}

/**
 * IIRFilter - Infinite Impulse Response Filter
 */
export class IIRFilter {
  public sampleRate: number;
  private func: LP12;

  constructor(type: FilterType, cutoff: number, resonance: number, sampleRate: number) {
    this.sampleRate = sampleRate;

    switch (type) {
      case FilterType.LOWPASS:
      default:
        this.func = new LP12(cutoff, resonance, sampleRate);
        break;
    }
  }

  get cutoff(): number {
    return this.func.cutoff;
  }

  get resonance(): number {
    return this.func.resonance;
  }

  set(cutoff: number, resonance: number): void {
    this.func.calcCoeff(cutoff, resonance);
  }

  process(buffer: SampleBuffer): void {
    this.func.process(buffer);
  }

  addEnvelope(envelope: ADSR): void {
    this.func.addEnvelope(envelope);
  }
}

/**
 * IIRFilter2 - Alternative IIR Filter implementation
 */
export class IIRFilter2 {
  public type: FilterType;
  public cutoff: number;
  public resonance: number;
  public sampleRate: number;
  public envelope: ADSR | null = null;
  private f: Float64Array;
  private freq = 0;
  private damp = 0;

  constructor(type: FilterType, cutoff: number, resonance: number, sampleRate: number) {
    this.type = type;
    this.cutoff = cutoff;
    this.resonance = resonance;
    this.sampleRate = sampleRate;

    this.f = new Float64Array(4);
    this.f[0] = 0.0; // lp
    this.f[1] = 0.0; // hp
    this.f[2] = 0.0; // bp
    this.f[3] = 0.0; // br

    this.calcCoeff(cutoff, resonance);
  }

  calcCoeff(cutoff: number, resonance: number): void {
    this.freq = 2 * Math.sin(Math.PI * Math.min(0.25, cutoff / (this.sampleRate * 2)));
    this.damp = Math.min(
      2 * (1 - Math.pow(resonance, 0.25)),
      Math.min(2, 2 / this.freq - this.freq * 0.5)
    );
  }

  process(buffer: SampleBuffer): void {
    const f = this.f;

    for (let i = 0; i < buffer.length; i++) {
      const input = buffer[i];

      // First pass
      f[3] = input - this.damp * f[2];
      f[0] = f[0] + this.freq * f[2];
      f[1] = f[3] - f[0];
      f[2] = this.freq * f[1] + f[2];
      let output = 0.5 * f[this.type];

      // Second pass
      f[3] = input - this.damp * f[2];
      f[0] = f[0] + this.freq * f[2];
      f[1] = f[3] - f[0];
      f[2] = this.freq * f[1] + f[2];
      output += 0.5 * f[this.type];

      if (this.envelope) {
        buffer[i] = buffer[i] * (1 - this.envelope.value()) + output * this.envelope.value();
        this.envelope.samplesProcessed++;
      } else {
        buffer[i] = output;
      }
    }
  }

  addEnvelope(envelope: ADSR): void {
    this.envelope = envelope;
  }

  set(cutoff: number, resonance: number): void {
    this.calcCoeff(cutoff, resonance);
  }
}
