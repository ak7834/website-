import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Upload, Wand2, Download } from 'lucide-react';
import { VOICE_STYLES, CHARACTER_CAST, VIDEO_LANGUAGES } from '../engine/presets';
import { CharacterId, SingleVoiceStyleId, VideoLanguageOption } from '../types/studio';
import { CartoonVoiceEngine } from '../engine/cartoonVoice';
import { CharacterAvatar } from './CharacterAvatar';

interface VoiceLabViewProps {
  voiceEngine: CartoonVoiceEngine;
}

const LAB_STYLES = VOICE_STYLES.filter((v) => v.id !== 'dynamic_cast');

const VOICE_TO_CHAR: Record<SingleVoiceStyleId, CharacterId> = {
  kids_hero: 'pip',
  playful_kid: 'zuzu',
  chipmunk: 'milo',
  sweet_princess: 'bella',
  fairy: 'luna',
  goofy_clown: 'kiko',
  robot: 'barnaby',
  giant_dragon: 'golu',
  narrator: 'toto',
  original: 'coco',
};

const SAMPLE_LINES_BY_LANG: Partial<Record<VideoLanguageOption, string>> = {
  Hindi: 'नमस्ते दोस्तों! आज हमारे 3D कार्टून नाटक में बहुत बड़ा मज़ा आने वाला है!',
  English: 'Welcome to our 3D cartoon playhouse! Ready for an awesome kids drama adventure?',
  Hinglish: 'Hello doston! Aaj hamare 3D cartoon playhouse mein super fun drama shuru hone wala hai!',
};

export function VoiceLabView({ voiceEngine }: VoiceLabViewProps) {
  const [selectedStyle, setSelectedStyle] = useState<SingleVoiceStyleId>('playful_kid');
  const [language, setLanguage] = useState<VideoLanguageOption>('Hindi');
  const [pitchOffset, setPitchOffset] = useState(0);
  const [brightnessBoost, setBrightnessBoost] = useState(0);
  const [effectMix, setEffectMix] = useState(1);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveLevel, setLiveLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiScript, setAiScript] = useState(SAMPLE_LINES_BY_LANG.Hindi || '');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const playingSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      setLiveLevel(0);
      return;
    }
    const tick = () => {
      setLiveLevel(voiceEngine.getLiveAudioLevel());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, voiceEngine]);

  useEffect(() => {
    voiceEngine.applyVoiceStyle(selectedStyle, {
      pitchOffsetSemitones: pitchOffset,
      brightnessBoostDb: brightnessBoost,
      effectMix,
    });
  }, [selectedStyle, pitchOffset, brightnessBoost, effectMix, voiceEngine]);

  const handleLanguageChange = (nextLang: VideoLanguageOption) => {
    setLanguage(nextLang);
    if (SAMPLE_LINES_BY_LANG[nextLang]) {
      setAiScript(SAMPLE_LINES_BY_LANG[nextLang]!);
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const arrayBuf = await blob.arrayBuffer();
        const ctx = await voiceEngine.ensureInitialized();
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        setAudioBuffer(decoded);
        setSourceLabel(`Original Microphone Voice (${decoded.duration.toFixed(1)}s · Language Preserved)`);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setIsRecording(true);
      setRecordingSec(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSec((s) => s + 0.1);
      }, 100);
    } catch {
      setErrorMsg('Microphone permission was denied or unavailable. You can upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleUploadAudio = async (file: File | null) => {
    if (!file) return;
    setErrorMsg(null);
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = await voiceEngine.ensureInitialized();
      const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      setAudioBuffer(decoded);
      setSourceLabel(`${file.name} (${decoded.duration.toFixed(1)}s · Original Language Preserved)`);
    } catch {
      setErrorMsg('Could not decode that audio file. Please try WAV, MP3, M4A, or WebM.');
    }
  };

  const handlePlayTransformed = async () => {
    if (!audioBuffer) return;
    if (isPlaying && playingSrcRef.current) {
      playingSrcRef.current.stop();
      playingSrcRef.current = null;
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    const src = await voiceEngine.playBufferWithVoiceStyle(audioBuffer, selectedStyle, {
      pitchOffsetSemitones: pitchOffset,
      brightnessBoostDb: brightnessBoost,
      effectMix,
    });
    playingSrcRef.current = src;
    src.onended = () => {
      setIsPlaying(false);
      playingSrcRef.current = null;
    };
  };

  const handleGenerateAiVoice = async () => {
    if (!aiScript.trim()) return;
    setIsGeneratingAi(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/cartoon-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          voiceStyle: selectedStyle === 'original' ? 'playful_kid' : selectedStyle,
          language,
          lines: [{ speaker: 'Narrator', text: aiScript.trim() }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Voice generation failed.');
      }

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAiAudioUrl(url);

      const ctx = await voiceEngine.ensureInitialized();
      const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
      setAudioBuffer(decoded);
      setSourceLabel(`${language} Cartoon Voice (${decoded.duration.toFixed(1)}s)`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate AI voiceover.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const activeChar = VOICE_TO_CHAR[selectedStyle] || 'pip';
  const activeCharProfile = CHARACTER_CAST.find((c) => c.id === activeChar) ?? CHARACTER_CAST[0];

  return (
    <section className="max-w-[1360px] mx-auto px-6 py-8">
      <div className="pb-6 border-b border-slate-200">
        <p className="text-xs font-medium text-slate-500">
          Hindi · English · Any Spoken Language Preserved 100% · Real-Time Cartoon Voice DSP
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1 text-balance">
          Multilingual Animated Character Voice Lab
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          Speak or upload audio in Hindi, English, Punjabi, Tamil, Spanish, or any language — your exact spoken words and language stay intact while transforming into 10 animated cartoon character voices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col items-center text-center">
            <CharacterAvatar
              characterId={activeChar}
              size={180}
              animated
              emotion={isPlaying ? 'excited' : 'happy'}
              audioLevel={isPlaying ? Math.max(0.22, liveLevel) : 0.08}
            />
            <h2 className="text-xl font-bold text-slate-900 mt-4">
              {activeCharProfile.name} — {activeCharProfile.role}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {sourceLabel || 'Record or upload audio in any language to convert into cartoon voice'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Mic className="w-4 h-4" />
                <span>Record Voice</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap tabular-nums"
              >
                <Square className="w-4 h-4" />
                <span>Stop ({recordingSec.toFixed(1)}s)</span>
              </button>
            )}

            <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap">
              <Upload className="w-4 h-4" />
              <span>Upload Audio</span>
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => handleUploadAudio(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={!audioBuffer}
              onClick={handlePlayTransformed}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors cursor-pointer"
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Stop Preview' : 'Play Cartoonized Voice'}</span>
            </button>

            {aiAudioUrl && (
              <a
                href={aiAudioUrl}
                download={`toonstage-${language.toLowerCase()}-${selectedStyle}.wav`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>WAV</span>
              </a>
            )}
          </div>

          {errorMsg && (
            <p className="mt-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-base font-bold text-slate-900">10 Animated Character Voice Styles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {LAB_STYLES.map((preset) => {
                const active = selectedStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedStyle(preset.id as SingleVoiceStyleId)}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'border-orange-500 bg-orange-50/70'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{preset.name}</span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {preset.pitchSemitones > 0 ? `+${preset.pitchSemitones}` : preset.pitchSemitones} st
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{preset.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6 pt-5 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-2">
                  <span>Pitch Offset</span>
                  <span className="font-mono tabular-nums">
                    {pitchOffset > 0 ? `+${pitchOffset.toFixed(1)}` : pitchOffset.toFixed(1)} st
                  </span>
                </div>
                <input
                  type="range"
                  min={-6}
                  max={6}
                  step={0.5}
                  value={pitchOffset}
                  onChange={(e) => setPitchOffset(Number(e.target.value))}
                  className="studio-slider w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-2">
                  <span>Cartoon Brightness</span>
                  <span className="font-mono tabular-nums">
                    {brightnessBoost > 0 ? `+${brightnessBoost}` : brightnessBoost} dB
                  </span>
                </div>
                <input
                  type="range"
                  min={-6}
                  max={8}
                  step={1}
                  value={brightnessBoost}
                  onChange={(e) => setBrightnessBoost(Number(e.target.value))}
                  className="studio-slider w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-2">
                  <span>Effect Mix</span>
                  <span className="font-mono tabular-nums">{Math.round(effectMix * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={effectMix}
                  onChange={(e) => setEffectMix(Number(e.target.value))}
                  className="studio-slider w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Synthesize Same-Language Cartoon Dialogue
              </h3>
              <select
                aria-label="Cartoon voice synthesis language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as VideoLanguageOption)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              >
                {VIDEO_LANGUAGES.filter((l) => l.id !== 'auto').map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Write Hindi, English, or any other language line to generate an animated character voiceover in that exact same language.
            </p>
            <textarea
              rows={2}
              value={aiScript}
              onChange={(e) => setAiScript(e.target.value)}
              className="w-full mt-3 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              placeholder="Write a cartoon dialogue line in Hindi, English, or any language..."
            />
            <div className="flex items-center justify-end mt-3">
              <button
                type="button"
                disabled={isGeneratingAi || !aiScript.trim()}
                onClick={handleGenerateAiVoice}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>
                  {isGeneratingAi ? 'Synthesizing Voice...' : `Synthesize ${language} Cartoon Voice`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
