import { useState } from 'react';
import { Volume2, Plus } from 'lucide-react';
import { CHARACTER_CAST, getVoicePreset } from '../engine/presets';
import { CharacterEmotion, CharacterId } from '../types/studio';
import { CharacterAvatar } from './CharacterAvatar';
import { CartoonVoiceEngine } from '../engine/cartoonVoice';

interface CastLibraryViewProps {
  voiceEngine: CartoonVoiceEngine;
  onAssignCharacterToStudio: (characterId: CharacterId) => void;
}

const EMOTIONS: CharacterEmotion[] = ['happy', 'excited', 'laughing', 'heroic', 'curious', 'surprised'];

export function CastLibraryView({
  voiceEngine,
  onAssignCharacterToStudio,
}: CastLibraryViewProps) {
  const [hoveredId, setHoveredId] = useState<CharacterId | null>(null);
  const [emotion, setEmotion] = useState<CharacterEmotion>('excited');
  const [speakingId, setSpeakingId] = useState<CharacterId | null>(null);

  const handlePreviewVoice = async (
    charId: CharacterId,
    defaultVoice: (typeof CHARACTER_CAST)[number]['defaultVoice']
  ) => {
    setSpeakingId(charId);
    try {
      await voiceEngine.playCharacterPreviewChime(defaultVoice);
    } finally {
      window.setTimeout(() => setSpeakingId((curr) => (curr === charId ? null : curr)), 680);
    }
  };

  return (
    <section className="max-w-[1360px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            16 Animated Cast Members · Audio-Reactive Lip Sync · Zero-Repeat Scene Rotation
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1 text-balance">
            Kids Play Drama Cast Library
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            Sixteen distinct 3D-shaded animated characters rotate automatically across every scene of your video — or pose beside your converted 3D cartoon photos — each with unique movement choreography, props, and cartoon voice styling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          {EMOTIONS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmotion(em)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                emotion === em
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        {CHARACTER_CAST.map((char) => {
          const isActive = hoveredId === char.id || speakingId === char.id;
          const voicePreset = getVoicePreset(char.defaultVoice);

          return (
            <article
              key={char.id}
              onMouseEnter={() => setHoveredId(char.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between transition-colors hover:border-slate-300"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <CharacterAvatar
                    characterId={char.id}
                    size={84}
                    animated={isActive}
                    emotion={emotion}
                    audioLevel={speakingId === char.id ? 0.85 : isActive ? 0.3 : 0.08}
                  />
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500">{char.role}</p>
                    <p className="text-xs text-slate-400 mt-1">{voicePreset.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{char.defaultAction}</p>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mt-4">{char.name}</h2>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{char.bio}</p>

                <p className="text-xs text-slate-500 mt-3 italic">"{char.sampleLine}"</p>
              </div>

              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handlePreviewVoice(char.id, char.defaultVoice)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Voice Tone</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAssignCharacterToStudio(char.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Use in Studio</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
