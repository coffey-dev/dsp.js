/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Biquad filter implementation
 * Based on: http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 */

import { TWO_PI, BiquadFilterType, BiquadParameterType } from './constants.js';
import { sinh } from './window-function.js';
import type { SampleBuffer } from './types.js';

/**
 * Biquad filter
 */
export class Biquad {
  public Fs: number;
  public type: BiquadFilterType;
  public parameterType: BiquadParameterType;
  public f0: number;
  public dBgain: number;
  public Q: number;
  public BW: number;
  public S: number;

  private x_1_l = 0;
  private x_2_l = 0;
  private y_1_l = 0;
  private y_2_l = 0;
  private x_1_r = 0;
  private x_2_r = 0;
  private y_1_r = 0;
  private y_2_r = 0;

  public b0 = 1;
  public a0 = 1;
  public b1 = 0;
  public a1 = 0;
  public b2 = 0;
  public a2 = 0;

  private b0a0 = 1;
  private b1a0 = 0;
  private b2a0 = 0;
  private a1a0 = 0;
  private a2a0 = 0;

  /**
   * @param type - Filter type
   * @param sampleRate - Sample rate
   */
  constructor(type: BiquadFilterType, sampleRate: number) {
    this.Fs = sampleRate;
    this.type = type;
    this.parameterType = BiquadParameterType.Q;
    this.f0 = 3000;
    this.dBgain = 12;
    this.Q = 1;
    this.BW = -3;
    this.S = 1;
    this.recalculateCoefficients();
  }

  /**
   * Get coefficients
   */
  coefficients(): { b: number[]; a: number[] } {
    return {
      b: [this.b0, this.b1, this.b2],
      a: [this.a0, this.a1, this.a2],
    };
  }

  setFilterType(type: BiquadFilterType): void {
    this.type = type;
    this.recalculateCoefficients();
  }

  setSampleRate(rate: number): void {
    this.Fs = rate;
    this.recalculateCoefficients();
  }

  setQ(q: number): void {
    this.parameterType = BiquadParameterType.Q;
    this.Q = Math.max(Math.min(q, 115.0), 0.001);
    this.recalculateCoefficients();
  }

  setBW(bw: number): void {
    this.parameterType = BiquadParameterType.BW;
    this.BW = bw;
    this.recalculateCoefficients();
  }

  setS(s: number): void {
    this.parameterType = BiquadParameterType.S;
    this.S = Math.max(Math.min(s, 5.0), 0.0001);
    this.recalculateCoefficients();
  }

  setF0(freq: number): void {
    this.f0 = freq;
    this.recalculateCoefficients();
  }

  setDbGain(g: number): void {
    this.dBgain = g;
    this.recalculateCoefficients();
  }

  private recalculateCoefficients(): void {
    let A: number;
    if (
      this.type === BiquadFilterType.PEAKING_EQ ||
      this.type === BiquadFilterType.LOW_SHELF ||
      this.type === BiquadFilterType.HIGH_SHELF
    ) {
      A = Math.pow(10, this.dBgain / 40);
    } else {
      A = Math.sqrt(Math.pow(10, this.dBgain / 20));
    }

    const w0 = (TWO_PI * this.f0) / this.Fs;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);

    let alpha = 0;

    switch (this.parameterType) {
      case BiquadParameterType.Q:
        alpha = sinw0 / (2 * this.Q);
        break;
      case BiquadParameterType.BW:
        alpha = sinw0 * sinh((Math.LN2 / 2) * this.BW * (w0 / sinw0));
        break;
      case BiquadParameterType.S:
        alpha = (sinw0 / 2) * Math.sqrt((A + 1 / A) * (1 / this.S - 1) + 2);
        break;
    }

    let coeff: number;

    switch (this.type) {
      case BiquadFilterType.LPF:
        this.b0 = (1 - cosw0) / 2;
        this.b1 = 1 - cosw0;
        this.b2 = (1 - cosw0) / 2;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
        break;

      case BiquadFilterType.HPF:
        this.b0 = (1 + cosw0) / 2;
        this.b1 = -(1 + cosw0);
        this.b2 = (1 + cosw0) / 2;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
        break;

      case BiquadFilterType.BPF_CONSTANT_SKIRT:
        this.b0 = sinw0 / 2;
        this.b1 = 0;
        this.b2 = -sinw0 / 2;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
        break;

      case BiquadFilterType.BPF_CONSTANT_PEAK:
        this.b0 = alpha;
        this.b1 = 0;
        this.b2 = -alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
        break;

      case BiquadFilterType.NOTCH:
        this.b0 = 1;
        this.b1 = -2 * cosw0;
        this.b2 = 1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
        break;

      case BiquadFilterType.APF:
        this.b0 = 1 - alpha;
        this.b1 = -2 * cosw0;
        this.b2 = 1 + alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
        break;

      case BiquadFilterType.PEAKING_EQ:
        this.b0 = 1 + alpha * A;
        this.b1 = -2 * cosw0;
        this.b2 = 1 - alpha * A;
        this.a0 = 1 + alpha / A;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha / A;
        break;

      case BiquadFilterType.LOW_SHELF:
        coeff = sinw0 * Math.sqrt((A ** 2 + 1) * (1 / this.S - 1) + 2 * A);
        this.b0 = A * ((A + 1) - (A - 1) * cosw0 + coeff);
        this.b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
        this.b2 = A * ((A + 1) - (A - 1) * cosw0 - coeff);
        this.a0 = A + 1 + (A - 1) * cosw0 + coeff;
        this.a1 = -2 * ((A - 1) + (A + 1) * cosw0);
        this.a2 = A + 1 + (A - 1) * cosw0 - coeff;
        break;

      case BiquadFilterType.HIGH_SHELF:
        coeff = sinw0 * Math.sqrt((A ** 2 + 1) * (1 / this.S - 1) + 2 * A);
        this.b0 = A * ((A + 1) + (A - 1) * cosw0 + coeff);
        this.b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
        this.b2 = A * ((A + 1) + (A - 1) * cosw0 - coeff);
        this.a0 = A + 1 - (A - 1) * cosw0 + coeff;
        this.a1 = 2 * ((A - 1) - (A + 1) * cosw0);
        this.a2 = A + 1 - (A - 1) * cosw0 - coeff;
        break;
    }

    this.b0a0 = this.b0 / this.a0;
    this.b1a0 = this.b1 / this.a0;
    this.b2a0 = this.b2 / this.a0;
    this.a1a0 = this.a1 / this.a0;
    this.a2a0 = this.a2 / this.a0;
  }

  /**
   * Process a mono buffer
   * @param buffer - Input buffer
   * @returns Filtered output
   */
  process(buffer: SampleBuffer): Float64Array {
    const len = buffer.length;
    const output = new Float64Array(len);

    for (let i = 0; i < len; i++) {
      output[i] =
        this.b0a0 * buffer[i] +
        this.b1a0 * this.x_1_l +
        this.b2a0 * this.x_2_l -
        this.a1a0 * this.y_1_l -
        this.a2a0 * this.y_2_l;
      this.y_2_l = this.y_1_l;
      this.y_1_l = output[i];
      this.x_2_l = this.x_1_l;
      this.x_1_l = buffer[i];
    }

    return output;
  }

  /**
   * Process a stereo interleaved buffer
   * @param buffer - Interleaved stereo input buffer
   * @returns Filtered interleaved output
   */
  processStereo(buffer: SampleBuffer): Float64Array {
    const len = buffer.length;
    const output = new Float64Array(len);

    for (let i = 0; i < len / 2; i++) {
      output[2 * i] =
        this.b0a0 * buffer[2 * i] +
        this.b1a0 * this.x_1_l +
        this.b2a0 * this.x_2_l -
        this.a1a0 * this.y_1_l -
        this.a2a0 * this.y_2_l;
      this.y_2_l = this.y_1_l;
      this.y_1_l = output[2 * i];
      this.x_2_l = this.x_1_l;
      this.x_1_l = buffer[2 * i];

      output[2 * i + 1] =
        this.b0a0 * buffer[2 * i + 1] +
        this.b1a0 * this.x_1_r +
        this.b2a0 * this.x_2_r -
        this.a1a0 * this.y_1_r -
        this.a2a0 * this.y_2_r;
      this.y_2_r = this.y_1_r;
      this.y_1_r = output[2 * i + 1];
      this.x_2_r = this.x_1_r;
      this.x_1_r = buffer[2 * i + 1];
    }

    return output;
  }
}
