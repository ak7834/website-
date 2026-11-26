import { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { ActiveNavSection, CharacterId } from './types/studio';
import { CartoonVoiceEngine } from './engine/cartoonVoice';
import { SamplePresetItem } from './engine/sampleMedia';
import { StudioWorkspace } from './components/StudioWorkspace';
import { CastLibraryView } from './components/CastLibraryView';
import { VoiceLabView } from './components/VoiceLabView';
import { ShowcaseView } from './components/ShowcaseView';

export default function App() {
  const [activeNav, setActiveNav] = useState<ActiveNavSection>('studio');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingSample, setPendingSample] = useState<SamplePresetItem | null>(null);
  const [pendingCharacter, setPendingCharacter] = useState<CharacterId | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceEngine = useMemo(() => new CartoonVoiceEngine(), []);

  const triggerUploadDialog = () => {
    fileInputRef.current?.click();
  };

  const handleGlobalFilePicked = (file: File | null) => {
    if (!file) return;
    setPendingFile(file);
    setActiveNav('studio');
  };

  const handleLoadSample = (sample: SamplePresetItem) => {
    setPendingSample(sample);
    setActiveNav('studio');
  };

  const handleAssignCharacter = (charId: CharacterId) => {
    setPendingCharacter(charId);
    setActiveNav('studio');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-slate-900">
      {/* Global Hidden Upload Picker (Photo or Video) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          handleGlobalFilePicked(picked);
          e.target.value = '';
        }}
      />

      {/* Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (4 single-line links) — Zone 3 (1 primary CTA) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('studio');
            }}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            ToonStage
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {(
              [
                { id: 'studio', label: 'Studio' },
                { id: 'cast', label: 'Cast Library' },
                { id: 'voice', label: 'Voice Lab' },
                { id: 'showcase', label: 'Showcase' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeNav === item.id
                    ? 'text-slate-900 border-orange-600'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={triggerUploadDialog}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Media</span>
            </button>
          </div>
        </div>

        {/* Compact Mobile Navigation Row */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-around text-xs font-medium">
          {(
            [
              { id: 'studio', label: 'Studio' },
              { id: 'cast', label: 'Cast' },
              { id: 'voice', label: 'Voice Lab' },
              { id: 'showcase', label: 'Showcase' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`px-2 py-1 rounded-md whitespace-nowrap cursor-pointer ${
                activeNav === item.id ? 'text-orange-600 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1">
        {activeNav === 'studio' && (
          <StudioWorkspace
            voiceEngine={voiceEngine}
            pendingFile={pendingFile}
            onConsumePendingFile={() => setPendingFile(null)}
            pendingSample={pendingSample}
            onConsumePendingSample={() => setPendingSample(null)}
            pendingCharacterToAssign={pendingCharacter}
            onConsumePendingCharacter={() => setPendingCharacter(null)}
            onTriggerGlobalUpload={triggerUploadDialog}
          />
        )}

        {activeNav === 'cast' && (
          <CastLibraryView
            voiceEngine={voiceEngine}
            onAssignCharacterToStudio={handleAssignCharacter}
          />
        )}

        {activeNav === 'voice' && <VoiceLabView voiceEngine={voiceEngine} />}

        {activeNav === 'showcase' && <ShowcaseView onLoadSampleInStudio={handleLoadSample} />}
      </main>

      {/* Clean Quiet Studio Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>ToonStage · Free & Unlimited 3D Cartoon Photo, Video & Voice Studio</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveNav('studio')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Converter Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('cast')}
              className="hover:text-slate-900 cursor-pointer"
            >
              16-Character Cast
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('voice')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Voice Lab
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
