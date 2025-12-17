/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Real Fast Fourier Transform (RFFT)
 * Highly optimized for real-valued signals
 */

import { FourierTransform } from './fourier-transform.js';
import type { SampleBuffer } from './types.js';

/**
 * RFFT - Real Fast Fourier Transform
 * Optimized FFT for real-valued signals (forward transform only)
 */
export class RFFT extends FourierTransform {
  private trans: Float64Array;
  private reverseTable: Uint32Array;

  /**
   * @param bufferSize - The size of the sample buffer (must be power of 2)
   * @param sampleRate - The sample rate of the buffer (e.g., 44100)
   */
  constructor(bufferSize: number, sampleRate: number) {
    super(bufferSize, sampleRate);

    this.trans = new Float64Array(bufferSize);
    this.reverseTable = new Uint32Array(bufferSize);

    this.generateReverseTable();
  }

  /**
   * Performs reverse bin permutation
   */
  private reverseBinPermute(dest: Float64Array, source: SampleBuffer): void {
    const bufferSize = this.bufferSize;
    const halfSize = bufferSize >>> 1;
    const nm1 = bufferSize - 1;
    let i = 1;
    let r = 0;
    let h: number;

    dest[0] = source[0];

    do {
      r += halfSize;
      dest[i] = source[r];
      dest[r] = source[i];

      i++;

      h = halfSize << 1;
      while (((h = h >> 1), !((r ^= h) & h)));

      if (r >= i) {
        dest[i] = source[r];
        dest[r] = source[i];

        dest[nm1 - i] = source[nm1 - r];
        dest[nm1 - r] = source[nm1 - i];
      }
      i++;
    } while (i < halfSize);
    dest[nm1] = source[nm1];
  }

  /**
   * Generates the reverse table for bit reversal
   */
  private generateReverseTable(): void {
    const bufferSize = this.bufferSize;
    const halfSize = bufferSize >>> 1;
    const nm1 = bufferSize - 1;
    let i = 1;
    let r = 0;
    let h: number;

    this.reverseTable[0] = 0;

    do {
      r += halfSize;

      this.reverseTable[i] = r;
      this.reverseTable[r] = i;

      i++;

      h = halfSize << 1;
      while (((h = h >> 1), !((r ^= h) & h)));

      if (r >= i) {
        this.reverseTable[i] = r;
        this.reverseTable[r] = i;

        this.reverseTable[nm1 - i] = nm1 - r;
        this.reverseTable[nm1 - r] = nm1 - i;
      }
      i++;
    } while (i < halfSize);

    this.reverseTable[nm1] = nm1;
  }

  /**
   * Performs a forward transform on the sample buffer
   * @param buffer - The sample buffer
   */
  forward(buffer: SampleBuffer): void {
    const n = this.bufferSize;
    const spectrum = this.spectrum;
    const x = this.trans;
    const TWO_PI = 2 * Math.PI;
    const sqrt = Math.sqrt;
    let i = n >>> 1;
    const bSi = 2 / n;
    let n2: number, n4: number, n8: number, nn: number;
    let t1: number, t2: number, t3: number, t4: number;
    let i0: number, i1: number, i2: number, i3: number, i4: number;
    let i5: number, i6: number, i7: number, i8: number;
    let st1: number, cc1: number, ss1: number, cc3: number, ss3: number;
    let e: number, a: number;
    let rval: number, ival: number, mag: number;

    this.reverseBinPermute(x, buffer);

    for (let ix = 0, id = 4; ix < n; id *= 4) {
      for (i0 = ix; i0 < n; i0 += id) {
        st1 = x[i0] - x[i0 + 1];
        x[i0] += x[i0 + 1];
        x[i0 + 1] = st1;
      }
      ix = 2 * (id - 1);
    }

    n2 = 2;
    nn = n >>> 1;

    while ((nn = nn >>> 1)) {
      let ix = 0;
      n2 = n2 << 1;
      let id = n2 << 1;
      n4 = n2 >>> 2;
      n8 = n2 >>> 3;
      do {
        if (n4 !== 1) {
          for (i0 = ix; i0 < n; i0 += id) {
            i1 = i0;
            i2 = i1 + n4;
            i3 = i2 + n4;
            i4 = i3 + n4;

            t1 = x[i3] + x[i4];
            x[i4] -= x[i3];
            x[i3] = x[i1] - t1;
            x[i1] += t1;

            i1 += n8;
            i2 += n8;
            i3 += n8;
            i4 += n8;

            t1 = x[i3] + x[i4];
            t2 = x[i3] - x[i4];

            t1 = -t1 * Math.SQRT1_2;
            t2 *= Math.SQRT1_2;

            st1 = x[i2];
            x[i4] = t1 + st1;
            x[i3] = t1 - st1;

            x[i2] = x[i1] - t2;
            x[i1] += t2;
          }
        } else {
          for (i0 = ix; i0 < n; i0 += id) {
            i1 = i0;
            i2 = i1 + n4;
            i3 = i2 + n4;
            i4 = i3 + n4;

            t1 = x[i3] + x[i4];
            x[i4] -= x[i3];

            x[i3] = x[i1] - t1;
            x[i1] += t1;
          }
        }

        ix = (id << 1) - n2;
        id = id << 2;
      } while (ix < n);

      e = TWO_PI / n2;

      for (let j = 1; j < n8; j++) {
        a = j * e;
        ss1 = Math.sin(a);
        cc1 = Math.cos(a);

        cc3 = 4 * cc1 * (cc1 * cc1 - 0.75);
        ss3 = 4 * ss1 * (0.75 - ss1 * ss1);

        ix = 0;
        id = n2 << 1;
        do {
          for (i0 = ix; i0 < n; i0 += id) {
            i1 = i0 + j;
            i2 = i1 + n4;
            i3 = i2 + n4;
            i4 = i3 + n4;

            i5 = i0 + n4 - j;
            i6 = i5 + n4;
            i7 = i6 + n4;
            i8 = i7 + n4;

            t2 = x[i7] * cc1 - x[i3] * ss1;
            t1 = x[i7] * ss1 + x[i3] * cc1;

            t4 = x[i8] * cc3 - x[i4] * ss3;
            t3 = x[i8] * ss3 + x[i4] * cc3;

            st1 = t2 - t4;
            t2 += t4;
            t4 = st1;

            x[i8] = t2 + x[i6];
            x[i3] = t2 - x[i6];

            st1 = t3 - t1;
            t1 += t3;
            t3 = st1;

            x[i4] = t3 + x[i2];
            x[i7] = t3 - x[i2];

            x[i6] = x[i1] - t1;
            x[i1] += t1;

            x[i2] = t4 + x[i5];
            x[i5] -= t4;
          }

          ix = (id << 1) - n2;
          id = id << 2;
        } while (ix < n);
      }
    }

    while (--i) {
      rval = x[i];
      ival = x[n - i - 1];
      mag = bSi * sqrt(rval * rval + ival * ival);

      if (mag > this.peak) {
        this.peakBand = i;
        this.peak = mag;
      }

      spectrum[i] = mag;
    }

    spectrum[0] = bSi * x[0];
  }
}
