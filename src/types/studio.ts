export type AnimationStyleId =
  | 'pixar_3d'
  | 'clay_playhouse'
  | 'storybook_cel'
  | 'toybox_pastel'
  | 'comic_drama';

export type VoiceStyleId =
  | 'dynamic_cast'
  | 'kids_hero'
  | 'playful_kid'
  | 'chipmunk'
  | 'fairy'
  | 'sweet_princess'
  | 'goofy_clown'
  | 'robot'
  | 'giant_dragon'
  | 'narrator'
  | 'original';

export type SingleVoiceStyleId = Exclude<VoiceStyleId, 'dynamic_cast'>;

export type CharacterId =
  | 'pip'
  | 'milo'
  | 'luna'
  | 'barnaby'
  | 'coco'
  | 'sunny'
  | 'bubu'
  | 'toto'
  | 'kiko'
  | 'bella'
  | 'zuzu'
  | 'raju'
  | 'mimi'
  | 'pogo'
  | 'nini'
  | 'golu';

export type CharacterEmotion =
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'heroic'
  | 'laughing'
  | 'curious';

export type SceneActionStyle =
  | 'bounce'
  | 'dance'
  | 'hero-jump'
  | 'float'
  | 'wave'
  | 'peek';

export type StagePropId =
  | 'stars'
  | 'rainbow'
  | 'bubbles'
  | 'crown'
  | 'sparkles'
  | 'notes'
  | 'curtains'
  | 'sunbeams'
  | 'butterflies'
  | 'balloons'
  | 'confetti';

export type StagePosition = 'left' | 'right' | 'bottom-left' | 'bottom-right';

export type VideoLanguageOption =
  | 'auto'
  | 'Hindi'
  | 'English'
  | 'Hinglish'
  | 'Punjabi'
  | 'Bengali'
  | 'Tamil'
  | 'Telugu'
  | 'Marathi'
  | 'Urdu'
  | 'Spanish'
  | 'French'
  | 'Arabic'
  | 'Japanese'
  | 'Korean';

export interface CartoonShaderParams {
  smoothness: number; // 0..1 bilateral painterly smoothing
  outlineStrength: number; // 0..1 sobel ink contour weight
  saturation: number; // 0.8..1.8 cartoon vibrancy
  rimGlow: number; // 0..1 3D specular rim & subsurface bounce
  toonBands: number; // 4..12 soft luminance steps
  warmth: number; // -0.2..0.4 storybook warmth tint
}

export interface AnimationStylePreset {
  id: AnimationStyleId;
  name: string;
  tagline: string;
  accentHex: string;
  params: CartoonShaderParams;
}

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  bio: string;
  accentHex: string;
  secondaryHex: string;
  defaultVoice: SingleVoiceStyleId;
  defaultProp: StagePropId;
  defaultAction: SceneActionStyle;
  sampleLine: string;
}

export interface VoiceStylePreset {
  id: VoiceStyleId;
  name: string;
  description: string;
  pitchSemitones: number;
  formantFreq: number;
  formantGainDb: number;
  brightnessDb: number;
  ringModHz: number;
  shimmerMix: number;
}

export interface SceneBeat {
  id: string;
  sceneTitle: string;
  startSec: number;
  endSec: number;
  characterId: CharacterId;
  buddyCharacterId?: CharacterId | null;
  caption: string;
  emotion: CharacterEmotion;
  action: SceneActionStyle;
  prop: StagePropId;
  voiceStyle: SingleVoiceStyleId;
  position: StagePosition;
}

export interface MediaAsset {
  kind: 'photo' | 'video';
  name: string;
  url: string;
  width: number;
  height: number;
  duration: number; // 0 for photo-only mode; exact video duration in seconds for video mode
  isSample?: boolean;
  isDemoReel?: boolean; // true only for the built-in 50s multi-scene demo video reel
}

export interface ExportState {
  status: 'idle' | 'rendering' | 'done' | 'error';
  progress: number; // 0..1
  currentSec: number;
  totalSec: number;
  outputUrl: string | null;
  outputName: string;
  outputKind: 'photo' | 'video';
  errorMessage?: string;
}

export type ActiveNavSection = 'studio' | 'cast' | 'voice' | 'showcase';
