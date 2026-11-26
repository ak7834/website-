import { Shuffle, Sparkles } from 'lucide-react';
import { SceneBeat, VideoLanguageOption } from '../types/studio';
import {
  VIDEO_LANGUAGES,
  formatTimecode,
  getCharacterById,
  getVoicePreset,
} from '../engine/presets';
import { CharacterAvatar } from './CharacterAvatar';

interface SceneTimelineProps {
  beats: SceneBeat[];
  currentTime: number;
  duration: number;
  selectedBeatId: string | null;
  beatLengthSec: number;
  language: VideoLanguageOption;
  isDirectingAi: boolean;
  episodeTitle: string;
  onSelectBeat: (beat: SceneBeat) => void;
  onChangeBeatLength: (sec: number) => void;
  onChangeLanguage: (lang: VideoLanguageOption) => void;
  onShuffleCast: () => void;
  onRunAiDirector: () => void;
}

const INTERVAL_OPTIONS = [3, 5, 7, 10];

export function SceneTimeline({
  beats,
  currentTime,
  duration,
  selectedBeatId,
  beatLengthSec,
  language,
  isDirectingAi,
  episodeTitle,
  onSelectBeat,
  onChangeBeatLength,
  onChangeLanguage,
  onShuffleCast,
  onRunAiDirector,
}: SceneTimelineProps) {
  const uniqueChars = new Set<string>();
  beats.forEach((b) => {
    uniqueChars.add(b.characterId);
    if (b.buddyCharacterId) uniqueChars.add(b.buddyCharacterId);
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-900">{episodeTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{duration.toFixed(1)}s Video Duration</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{beats.length} Defined Scenes</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{uniqueChars.size} Different Characters Active</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every scene across the full video has its own title, rotating 3D character cast (from 16 characters), action style, stage prop, and matching voice timbre. Click any scene to edit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Scene caption and voice language"
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as VideoLanguageOption)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            {VIDEO_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <span className="px-2 text-[11px] font-medium text-slate-500 whitespace-nowrap">
              Scene every
            </span>
            {INTERVAL_OPTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onChangeBeatLength(sec)}
                className={`px-2 py-1 text-xs font-mono tabular-nums font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  beatLengthSec === sec
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onShuffleCast}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle 16 Cast</span>
          </button>

          <button
            type="button"
            disabled={isDirectingAi}
            onClick={onRunAiDirector}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isDirectingAi ? 'Defining All Scenes...' : 'Auto-Define Every Scene'}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Storyboard Track */}
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex items-stretch gap-3 min-w-max">
          {beats.map((beat, idx) => {
            const char = getCharacterById(beat.characterId);
            const buddy = beat.buddyCharacterId ? getCharacterById(beat.buddyCharacterId) : null;
            const voice = getVoicePreset(beat.voiceStyle);
            const isPlayingBeat =
              currentTime >= beat.startSec &&
              (currentTime < beat.endSec || idx === beats.length - 1);
            const isSelected = selectedBeatId === beat.id;

            return (
              <button
                key={beat.id}
                type="button"
                onClick={() => onSelectBeat(beat)}
                className={`w-64 text-left p-3.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                  isPlayingBeat
                    ? 'border-orange-500 bg-orange-50/70 ring-1 ring-orange-500/30'
                    : isSelected
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500">
                  <span className="font-semibold text-slate-700">
                    Scene {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>
                    {formatTimecode(beat.startSec)} – {formatTimecode(beat.endSec)}
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                  {beat.sceneTitle || `Scene ${idx + 1}`}
                </p>

                <div className="flex items-center gap-2.5 mt-2.5">
                  <div className="relative shrink-0">
                    <CharacterAvatar
                      characterId={beat.characterId}
                      size={44}
                      animated={isPlayingBeat}
                      emotion={beat.emotion}
                      audioLevel={isPlayingBeat ? 0.55 : 0.08}
                    />
                    {buddy && (
                      <div className="absolute -bottom-1 -right-1.5 ring-2 ring-white rounded-lg overflow-hidden">
                        <CharacterAvatar
                          characterId={buddy.id}
                          size={22}
                          emotion="happy"
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {char.name}
                      {buddy ? ` + ${buddy.name}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate capitalize">
                      {beat.action} · {voice.name}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 mt-2.5 line-clamp-2 leading-snug">
                  "{beat.caption}"
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
