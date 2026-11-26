export const GENERATED_ASSETS = {
  sampleParkPhoto: '/src/assets/images/sample_kids_park_photo_1795173154691.jpg',
  sampleDramaPhoto: '/src/assets/images/sample_family_drama_photo_1795173155622.jpg',
  showcasePixar3D: '/src/assets/images/showcase_pixar_3d_1795173154146.jpg',
  showcaseClayPlayhouse: '/src/assets/images/showcase_clay_playhouse_1795173154061.jpg',
} as const;

export interface SamplePresetItem {
  id: string;
  label: string;
  subtitle: string;
  kind: 'photo' | 'video';
  duration: number;
  imageUrl: string;
  secondaryImageUrl?: string;
}

export const SAMPLE_MEDIA_ITEMS: SamplePresetItem[] = [
  {
    id: 'sample-park',
    label: 'Backyard Plane Photo',
    subtitle: 'Photo-Only 3D Cartoon Conversion (PNG/JPG)',
    kind: 'photo',
    duration: 0,
    imageUrl: GENERATED_ASSETS.sampleParkPhoto,
  },
  {
    id: 'sample-drama',
    label: 'Cardboard Crown Kids Photo',
    subtitle: 'Photo-Only 3D Cartoon & Kids Drama Cast Frame',
    kind: 'photo',
    duration: 0,
    imageUrl: GENERATED_ASSETS.sampleDramaPhoto,
  },
  {
    id: 'sample-50s-reel',
    label: '50s Multi-Character Demo Video',
    subtitle: 'Full 50.0s Video · 10 Defined Scenes · 16 Characters',
    kind: 'video',
    duration: 50,
    imageUrl: GENERATED_ASSETS.sampleDramaPhoto,
    secondaryImageUrl: GENERATED_ASSETS.sampleParkPhoto,
  },
];

/**
 * Generates a cheerful 50-second playful kids-playhouse marimba/voice-cadence WAV
 * locally in memory for the 50s demo video reel so users can test Dynamic Cast Voices immediately.
 */
export function createPlayhouseDemoAudioUrl(durationSec: number): string {
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0];
  let offset = 44;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatPos = t % 5.0;
    const stepIdx = Math.floor(t * 2.5) % notes.length;
    const localT = (t * 2.5) % 1.0;

    const phraseActive = beatPos < 4.1 ? 1.0 : 0.18;
    const noteEnv = Math.exp(-localT * 5.2) * Math.min(1, localT * 35);
    const freq = notes[stepIdx];

    const fundamental = Math.sin(2 * Math.PI * freq * t);
    const overtone = 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
    const sparkle = 0.12 * Math.sin(2 * Math.PI * freq * 3 * t);
    const sample = (fundamental + overtone + sparkle) * noteEnv * phraseActive * 0.28;

    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
