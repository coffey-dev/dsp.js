/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Constants and enumerations for DSP operations
 */

// Channel constants
export const enum Channel {
  LEFT = 0,
  RIGHT = 1,
  MIX = 2,
}

// Waveform types
export const enum Waveform {
  SINE = 1,
  TRIANGLE = 2,
  SAW = 3,
  SQUARE = 4,
}

// Filter types
export const enum FilterType {
  LOWPASS = 0,
  HIGHPASS = 1,
  BANDPASS = 2,
  NOTCH = 3,
}

// Window function types
export const enum WindowFunction {
  BARTLETT = 1,
  BARTLETTHANN = 2,
  BLACKMAN = 3,
  COSINE = 4,
  GAUSS = 5,
  HAMMING = 6,
  HANN = 7,
  LANCZOS = 8,
  RECTANGULAR = 9,
  TRIANGULAR = 10,
}

// Loop modes
export const enum LoopMode {
  OFF = 0,
  FW = 1,
  BW = 2,
  FWBW = 3,
}

// Biquad filter types
export const enum BiquadFilterType {
  LPF = 0,                    // H(s) = 1 / (s^2 + s/Q + 1)
  HPF = 1,                    // H(s) = s^2 / (s^2 + s/Q + 1)
  BPF_CONSTANT_SKIRT = 2,     // H(s) = s / (s^2 + s/Q + 1)
  BPF_CONSTANT_PEAK = 3,      // H(s) = (s/Q) / (s^2 + s/Q + 1)
  NOTCH = 4,                  // H(s) = (s^2 + 1) / (s^2 + s/Q + 1)
  APF = 5,                    // H(s) = (s^2 - s/Q + 1) / (s^2 + s/Q + 1)
  PEAKING_EQ = 6,             // H(s) = (s^2 + s*(A/Q) + 1) / (s^2 + s/(A*Q) + 1)
  LOW_SHELF = 7,              // H(s) = A * (s^2 + (sqrt(A)/Q)*s + A)/(A*s^2 + (sqrt(A)/Q)*s + 1)
  HIGH_SHELF = 8,             // H(s) = A * (A*s^2 + (sqrt(A)/Q)*s + 1)/(s^2 + (sqrt(A)/Q)*s + A)
}

// Biquad filter parameter types
export const enum BiquadParameterType {
  Q = 1,
  BW = 2,
  S = 3,
}

// Math constants
export const TWO_PI = 2 * Math.PI;
