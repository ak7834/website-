import { useState } from 'react';
import { ArrowRight, Film, Image as ImageIcon } from 'lucide-react';
import { GENERATED_ASSETS, SAMPLE_MEDIA_ITEMS, SamplePresetItem } from '../engine/sampleMedia';

interface ShowcaseViewProps {
  onLoadSampleInStudio: (sample: SamplePresetItem) => void;
}

function SafeImage({
  src,
  alt,
  fallbackTitle,
  className = '',
}: {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 text-slate-500 p-6 ${className}`}
      >
        <ImageIcon className="w-8 h-8 text-orange-500 mb-2" />
        <span className="text-xs font-semibold text-slate-700">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function ShowcaseView({ onLoadSampleInStudio }: ShowcaseViewProps) {
  return (
    <section className="max-w-[1360px] mx-auto px-6 py-8 space-y-10">
      <div className="pb-6 border-b border-slate-200">
        <p className="text-xs font-medium text-slate-500">
          Photo → 3D Cartoon Photo · Video → Full-Duration 3D Video · 16 Animated Cast · Any Language Audio
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1 text-balance">
          Animation Styles & Kids Drama Showcase
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          Upload a photo to get an instant high-resolution 3D cartoon photo (PNG/JPG), or upload a video of any length to define every scene with 16 rotating animated characters while keeping Hindi, English, or any original spoken language intact.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
            <SafeImage
              src={GENERATED_ASSETS.showcasePixar3D}
              alt="3D animated kids feature scene with explorer child and storybook fox"
              fallbackTitle="3D Kids Feature Style"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Photo Mode · Photo In → 3D Cartoon Photo Out (PNG / JPG)
              </p>
              <h2 className="text-xl font-bold text-slate-900 mt-1.5">
                Instant 3D Cartoon Photo Conversion
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Upload any photo and ToonStage converts it strictly into a crisp 3D animated cartoon photo — with sculpted shading, warm rim lighting, and optional 3D cast co-stars posed cleanly in the frame.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Photo Only · Instant PNG/JPG
              </span>
              <button
                type="button"
                onClick={() => onLoadSampleInStudio(SAMPLE_MEDIA_ITEMS[0])}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer whitespace-nowrap"
              >
                <span>Open Photo Sample</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </article>

        <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
            <SafeImage
              src={GENERATED_ASSETS.showcaseClayPlayhouse}
              alt="Stop-motion claymation kids playhouse stage with miniature wooden castle and clay characters"
              fallbackTitle="Claymation Playhouse Stage"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Video Mode · 16 Rotating Characters · Original Hindi / English / Any Language Voice
              </p>
              <h2 className="text-xl font-bold text-slate-900 mt-1.5">
                Full-Length Multi-Character Kids Drama Video
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Upload a 50-second video and ToonStage defines every scene across all 50.0 seconds with rotating characters, buddy cameos, and cartoon voice conversion that keeps your exact spoken language.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono tabular-nums text-slate-500">
                50.0s → 10 Defined Scenes
              </span>
              <button
                type="button"
                onClick={() => onLoadSampleInStudio(SAMPLE_MEDIA_ITEMS[2])}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer whitespace-nowrap"
              >
                <span>Open 50s Video Sample</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </article>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">Ready-to-Convert Sample Media</h2>
        <p className="text-sm text-slate-600 mt-1">
          Test Photo-Only 3D Cartoon mode or Full 50-Second Multi-Character Video mode with one click.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          {SAMPLE_MEDIA_ITEMS.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <SafeImage
                  src={item.imageUrl}
                  alt={item.label}
                  fallbackTitle={item.label}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {item.kind === 'photo'
                      ? 'Photo Mode · PNG / JPG Output'
                      : `Video Mode · ${item.duration.toFixed(1)}s · 10 Defined Scenes`}
                  </p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{item.label}</h3>
                  <p className="text-xs text-slate-600 mt-1">{item.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadSampleInStudio(item)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  {item.kind === 'photo' ? (
                    <ImageIcon className="w-3.5 h-3.5" />
                  ) : (
                    <Film className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {item.kind === 'photo' ? 'Open as 3D Cartoon Photo' : 'Open as 50s Cartoon Video'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
