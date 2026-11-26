import { SingleVoiceStyleId } from '../types/studio';
import { getVoicePreset } from './presets';

/**
 * Overlap-Add Dual-Tap Delay Pitch Shifter AudioWorkletProcessor.
 * Transforms original speech (Hindi, English, Punjabi, Spanish, or ANY language)
 * into animated cartoon character vocal timbres at EXACT 1.0x playback speed —
 * preserving every original spoken word, accent, language, and exact video duration!
 */
const PITCH_SHIFTER_WORKLET_CODE = `
class CartoonPitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'pitchRatio', defaultValue: 1.0, minValue: 0.5, maxValue: 2.2, automationRate: 'k-rate' },
      { name: 'wetMix', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.bufSize = 8192;
    this.mask = this.bufSize - 1;
    this.buffers = [new Float32Array(this.bufSize), new Float32Array(this.bufSize)];
    this.writeIndex = 0;
    this.windowSize = 1536;
    this.phase = 0;
  }

  readInterpolated(buf, delaySamples) {
    let readPos = this.writeIndex - delaySamples;
    while (readPos < 0) readPos += this.bufSize;
    const i0 = Math.floor(readPos) & this.mask;
    const i1 = (i0 + 1) & this.mask;
    const frac = readPos - Math.floor(readPos);
    return buf[i0] * (1 - frac) + buf[i1] * frac;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const pitchRatio = parameters.pitchRatio[0];
    const wetMix = parameters.wetMix[0];
    const numChannels = Math.min(input.length, output.length, 2);
    const frameCount = output[0].length;

    const bypass = Math.abs(pitchRatio - 1.0) < 0.01 || wetMix < 0.01;
    const phaseStep = (1.0 - pitchRatio) / this.windowSize;

    for (let i = 0; i < frameCount; i++) {
      this.writeIndex = (this.writeIndex + 1) & this.mask;
      this.phase += phaseStep;
      if (this.phase >= 1.0) this.phase -= 1.0;
      if (this.phase < 0.0) this.phase += 1.0;

      const phaseA = this.phase;
      const phaseB = (this.phase + 0.5) % 1.0;

      const winA = 0.5 - 0.5 * Math.cos(2.0 * Math.PI * phaseA);
      const winB = 0.5 - 0.5 * Math.cos(2.0 * Math.PI * phaseB);

      const delayA = phaseA * this.windowSize + 48;
      const delayB = phaseB * this.windowSize + 48;

      for (let ch = 0; ch < numChannels; ch++) {
        const dry = input[ch][i] || 0;
        const buf = this.buffers[ch];
        buf[this.writeIndex] = dry;

        if (bypass) {
          output[ch][i] = dry;
        } else {
          const wet = this.readInterpolated(buf, delayA) * winA + this.readInterpolated(buf, delayB) * winB;
          output[ch][i] = dry * (1.0 - wetMix) + wet * wetMix;
        }
      }
    }

    return true;
  }
}

registerProcessor('cartoon-pitch-shifter', CartoonPitchShifterProcessor);
`;

export interface VoiceTuningOverrides {
  pitchOffsetSemitones: number;
  brightnessBoostDb: number;
  effectMix: number; // 0..1
}

export class CartoonVoiceEngine {
  private ctx: AudioContext | null = null;
  private workletReady = false;
  private pitchNode: AudioWorkletNode | null = null;
  private clarityHighpass: BiquadFilterNode | null = null;
  private formantFilter: BiquadFilterNode | null = null;
  private brightnessFilter: BiquadFilterNode | null = null;
  private ringModGain: GainNode | null = null;
  private ringModOsc: OscillatorNode | null = null;
  private ringModDepth: GainNode | null = null;
  private shimmerDelay: DelayNode | null = null;
  private shimmerGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private inputBus: GainNode | null = null;
  private connectedElements = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private timeDomainData = new Uint8Array(256);

  public async ensureInitialized(): Promise<AudioContext> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return this.ctx;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    this.inputBus = ctx.createGain();

    // Gentle speech clarity high-pass filter keeps Hindi/English/any-language consonants super crisp
    this.clarityHighpass = ctx.createBiquadFilter();
    this.clarityHighpass.type = 'highpass';
    this.clarityHighpass.frequency.value = 110;
    this.clarityHighpass.Q.value = 0.7;

    this.formantFilter = ctx.createBiquadFilter();
    this.formantFilter.type = 'peaking';
    this.formantFilter.Q.value = 1.45;

    this.brightnessFilter = ctx.createBiquadFilter();
    this.brightnessFilter.type = 'highshelf';
    this.brightnessFilter.frequency.value = 3200;

    this.ringModGain = ctx.createGain();
    this.ringModGain.gain.value = 1.0;
    this.ringModOsc = ctx.createOscillator();
    this.ringModOsc.type = 'sine';
    this.ringModOsc.frequency.value = 74;
    this.ringModDepth = ctx.createGain();
    this.ringModDepth.gain.value = 0.0;
    this.ringModOsc.connect(this.ringModDepth);
    this.ringModDepth.connect(this.ringModGain.gain);
    this.ringModOsc.start();

    this.shimmerDelay = ctx.createDelay(0.2);
    this.shimmerDelay.delayTime.value = 0.028;
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0.0;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.ratio.value = 3.5;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.72;

    this.streamDest = ctx.createMediaStreamDestination();

    try {
      if (ctx.audioWorklet) {
        const blob = new Blob([PITCH_SHIFTER_WORKLET_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        this.pitchNode = new AudioWorkletNode(ctx, 'cartoon-pitch-shifter', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });
        this.workletReady = true;
      }
    } catch (err) {
      console.warn('AudioWorklet fallback (EQ-only cartoon shaping):', err);
      this.pitchNode = null;
    }

    this.inputBus.connect(this.clarityHighpass);
    if (this.pitchNode) {
      this.clarityHighpass.connect(this.pitchNode);
      this.pitchNode.connect(this.formantFilter);
    } else {
      this.clarityHighpass.connect(this.formantFilter);
    }

    this.formantFilter.connect(this.brightnessFilter);
    this.brightnessFilter.connect(this.ringModGain);
    this.ringModGain.connect(this.compressor);

    this.ringModGain.connect(this.shimmerDelay);
    this.shimmerDelay.connect(this.shimmerGain);
    this.shimmerGain.connect(this.compressor);

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.analyser.connect(this.streamDest);

    return ctx;
  }

  public async attachMediaElement(mediaEl: HTMLMediaElement) {
    const ctx = await this.ensureInitialized();
    if (!this.inputBus) return;

    let src = this.connectedElements.get(mediaEl);
    if (!src) {
      src = ctx.createMediaElementSource(mediaEl);
      this.connectedElements.set(mediaEl, src);
      src.connect(this.inputBus);
    }
  }

  public applyVoiceStyle(styleId: SingleVoiceStyleId, overrides: VoiceTuningOverrides) {
    if (
      !this.ctx ||
      !this.clarityHighpass ||
      !this.formantFilter ||
      !this.brightnessFilter ||
      !this.ringModDepth ||
      !this.ringModOsc ||
      !this.shimmerGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const preset = getVoicePreset(styleId);
    const isOriginal = styleId === 'original' || overrides.effectMix <= 0.01;

    const totalSemitones = isOriginal ? 0 : preset.pitchSemitones + overrides.pitchOffsetSemitones;
    const clampedSemi = Math.max(-9, Math.min(12, totalSemitones));
    const pitchRatio = Math.pow(2, clampedSemi / 12);

    // Keep deep dragon/elephant bass intact while cleaning mud for high cartoon kid voices
    const hpFreq = isOriginal ? 30 : clampedSemi < -1 ? 60 : 145;
    this.clarityHighpass.frequency.setTargetAtTime(hpFreq, now, 0.04);

    if (this.pitchNode && this.workletReady) {
      const pitchParam = this.pitchNode.parameters.get('pitchRatio');
      const wetParam = this.pitchNode.parameters.get('wetMix');
      pitchParam?.setTargetAtTime(pitchRatio, now, 0.04);
      wetParam?.setTargetAtTime(isOriginal ? 0 : overrides.effectMix, now, 0.04);
    }

    const mix = isOriginal ? 0 : overrides.effectMix;
    this.formantFilter.frequency.setTargetAtTime(preset.formantFreq, now, 0.05);
    this.formantFilter.gain.setTargetAtTime(preset.formantGainDb * mix, now, 0.05);

    this.brightnessFilter.gain.setTargetAtTime(
      (preset.brightnessDb + overrides.brightnessBoostDb) * mix,
      now,
      0.05
    );

    if (preset.ringModHz > 0 && mix > 0.1) {
      this.ringModOsc.frequency.setTargetAtTime(preset.ringModHz, now, 0.03);
      this.ringModDepth.gain.setTargetAtTime(0.42 * mix, now, 0.04);
    } else {
      this.ringModDepth.gain.setTargetAtTime(0, now, 0.04);
    }

    this.shimmerGain.gain.setTargetAtTime(preset.shimmerMix * mix, now, 0.05);
  }

  public setVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.5, volume)), this.ctx.currentTime, 0.03);
  }

  public getLiveAudioLevel(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    let sumSq = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const norm = (this.timeDomainData[i] - 128) / 128;
      sumSq += norm * norm;
    }
    const rms = Math.sqrt(sumSq / this.timeDomainData.length);
    return Math.min(1, rms * 4.5);
  }

  public getExportAudioStream(): MediaStream | null {
    return this.streamDest ? this.streamDest.stream : null;
  }

  public playCartoonTransitionSfx(variantIndex = 0) {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const kind = variantIndex % 3;
    if (kind === 0) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
    } else if (kind === 1) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.setValueAtTime(1046, now + 0.055);
      osc.frequency.setValueAtTime(1318, now + 0.11);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.085, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.2);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public async playBufferWithVoiceStyle(
    buffer: AudioBuffer,
    styleId: SingleVoiceStyleId,
    overrides: VoiceTuningOverrides
  ): Promise<AudioBufferSourceNode> {
    const ctx = await this.ensureInitialized();
    this.applyVoiceStyle(styleId, overrides);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    if (this.inputBus) {
      src.connect(this.inputBus);
    }
    src.start();
    return src;
  }

  public async playCharacterPreviewChime(styleId: SingleVoiceStyleId) {
    const ctx = await this.ensureInitialized();
    const now = ctx.currentTime;
    const preset = getVoicePreset(styleId);
    const baseFreq = 280 * Math.pow(2, preset.pitchSemitones / 12);
    const notes = [1, 1.25, 1.5, 1.25, 1.66];

    notes.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = styleId === 'robot' ? 'sawtooth' : styleId === 'fairy' ? 'triangle' : 'sine';
      const t = now + i * 0.085;
      osc.frequency.setValueAtTime(baseFreq * ratio, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      if (this.inputBus) {
        gain.connect(this.inputBus);
      } else {
        gain.connect(ctx.destination);
      }
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }
}
