/**
 * DSP.js - Digital Signal Processing for JavaScript
 *
 * Sampler for playing audio samples
 * Note: This class requires browser APIs (Audio element)
 */

import { LoopMode } from './constants.js';
import { getChannel } from './utils.js';
import type { ADSR } from './adsr.js';

/**
 * Sampler class for playing and manipulating audio samples
 * Note: Browser-only, uses HTMLAudioElement
 */
export class Sampler {
  public file: string;
  public bufferSize: number;
  public sampleRate: number;
  public playStart: number;
  public playEnd: number;
  public loopStart: number;
  public loopEnd: number;
  public loopMode: LoopMode;
  public loaded: boolean;
  public samples: Float64Array;
  public signal: Float64Array;
  public frameCount: number;
  public envelope: ADSR | null;
  public amplitude: number;
  public rootFrequency: number;
  public frequency: number;
  public step: number;
  public duration: number;
  public samplesProcessed: number;
  public playhead: number;

  /**
   * @param file - URL to audio file
   * @param bufferSize - Size of the sample buffer
   * @param sampleRate - Sample rate
   * @param playStart - Start position (0-1)
   * @param playEnd - End position (0-1)
   * @param loopStart - Loop start position (0-1)
   * @param loopEnd - Loop end position (0-1)
   * @param loopMode - Loop mode
   */
  constructor(
    file: string,
    bufferSize: number,
    sampleRate: number,
    playStart = 0,
    playEnd = 1,
    loopStart = 0,
    loopEnd = 1,
    loopMode = LoopMode.OFF
  ) {
    this.file = file;
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.playStart = playStart;
    this.playEnd = playEnd;
    this.loopStart = loopStart;
    this.loopEnd = loopEnd;
    this.loopMode = loopMode;
    this.loaded = false;
    this.samples = new Float64Array(0);
    this.signal = new Float64Array(bufferSize);
    this.frameCount = 0;
    this.envelope = null;
    this.amplitude = 1;
    this.rootFrequency = 110; // A2
    this.frequency = 550;
    this.step = this.frequency / this.rootFrequency;
    this.duration = 0;
    this.samplesProcessed = 0;
    this.playhead = 0;

    // Browser-specific initialization
    if (typeof document !== 'undefined') {
      this.initAudioElement();
    }
  }

  /**
   * Initialize the audio element (browser only)
   */
  private initAudioElement(): void {
    const audio = document.createElement('audio') as HTMLAudioElement;
    const tempSamples: number[] = [];

    const loadSamples = (event: any) => {
      const buffer = getChannel(2 as 0 | 1 | 2, event.frameBuffer); // MIX channel
      for (let i = 0; i < buffer.length; i++) {
        tempSamples.push(buffer[i]);
      }
    };

    const loadComplete = () => {
      this.samples = new Float64Array(tempSamples);
      this.loaded = true;
    };

    const loadMetaData = () => {
      this.duration = audio.duration;
    };

    audio.addEventListener('MozAudioAvailable', loadSamples, false);
    audio.addEventListener('loadedmetadata', loadMetaData, false);
    audio.addEventListener('ended', loadComplete, false);
    audio.muted = true;
    audio.src = this.file;
    audio.play();
  }

  /**
   * Apply envelope to the signal
   * @returns The processed signal
   */
  applyEnvelope(): Float64Array {
    if (this.envelope) {
      this.envelope.process(this.signal);
    }
    return this.signal;
  }

  /**
   * Generate the next buffer of samples
   * @returns The generated signal
   */
  generate(): Float64Array {
    const loopWidth = this.playEnd * this.samples.length - this.playStart * this.samples.length;
    const playStartSamples = this.playStart * this.samples.length;
    const playEndSamples = this.playEnd * this.samples.length;

    for (let i = 0; i < this.bufferSize; i++) {
      switch (this.loopMode) {
        case LoopMode.OFF:
          this.playhead = Math.round(this.samplesProcessed * this.step + playStartSamples);
          if (this.playhead < this.playEnd * this.samples.length) {
            this.signal[i] = this.samples[this.playhead] * this.amplitude;
          } else {
            this.signal[i] = 0;
          }
          break;

        case LoopMode.FW:
          this.playhead = Math.round(
            ((this.samplesProcessed * this.step) % loopWidth) + playStartSamples
          );
          if (this.playhead < this.playEnd * this.samples.length) {
            this.signal[i] = this.samples[this.playhead] * this.amplitude;
          }
          break;

        case LoopMode.BW:
          this.playhead =
            playEndSamples - Math.round((this.samplesProcessed * this.step) % loopWidth);
          if (this.playhead < this.playEnd * this.samples.length) {
            this.signal[i] = this.samples[this.playhead] * this.amplitude;
          }
          break;

        case LoopMode.FWBW:
          if (Math.floor((this.samplesProcessed * this.step) / loopWidth) % 2 === 0) {
            this.playhead = Math.round(
              ((this.samplesProcessed * this.step) % loopWidth) + playStartSamples
            );
          } else {
            this.playhead =
              playEndSamples - Math.round((this.samplesProcessed * this.step) % loopWidth);
          }
          if (this.playhead < this.playEnd * this.samples.length) {
            this.signal[i] = this.samples[this.playhead] * this.amplitude;
          }
          break;
      }
      this.samplesProcessed++;
    }

    this.frameCount++;

    return this.signal;
  }

  /**
   * Set the frequency
   * @param frequency - The frequency
   */
  setFreq(frequency: number): void {
    const totalProcessed = this.samplesProcessed * this.step;
    this.frequency = frequency;
    this.step = this.frequency / this.rootFrequency;
    this.samplesProcessed = Math.round(totalProcessed / this.step);
  }

  /**
   * Reset the sampler
   */
  reset(): void {
    this.samplesProcessed = 0;
    this.playhead = 0;
  }
}
