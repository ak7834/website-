import {
  AnimationStylePreset,
  CharacterEmotion,
  CharacterId,
  CharacterProfile,
  SceneActionStyle,
  SceneBeat,
  SingleVoiceStyleId,
  StagePosition,
  StagePropId,
  VideoLanguageOption,
  VoiceStylePreset,
} from '../types/studio';

export const VIDEO_LANGUAGES: { id: VideoLanguageOption; label: string }[] = [
  { id: 'auto', label: 'Auto (Keep Original Audio Language)' },
  { id: 'Hindi', label: 'Hindi (हिन्दी)' },
  { id: 'English', label: 'English' },
  { id: 'Hinglish', label: 'Hinglish (Hindi + English)' },
  { id: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { id: 'Bengali', label: 'Bengali (বাংলা)' },
  { id: 'Tamil', label: 'Tamil (தமிழ்)' },
  { id: 'Telugu', label: 'Telugu (తెలుగు)' },
  { id: 'Marathi', label: 'Marathi (मराठी)' },
  { id: 'Urdu', label: 'Urdu (اردو)' },
  { id: 'Spanish', label: 'Spanish (Español)' },
  { id: 'French', label: 'French (Français)' },
  { id: 'Arabic', label: 'Arabic (العربية)' },
  { id: 'Japanese', label: 'Japanese (日本語)' },
  { id: 'Korean', label: 'Korean (한국어)' },
];

export const ANIMATION_STYLES: AnimationStylePreset[] = [
  {
    id: 'pixar_3d',
    name: '3D Kids Feature',
    tagline: 'Sculpted smooth shading, warm subsurface glow, soft studio rim light',
    accentHex: '#EA580C',
    params: {
      smoothness: 0.78,
      outlineStrength: 0.24,
      saturation: 1.32,
      rimGlow: 0.68,
      toonBands: 9,
      warmth: 0.16,
    },
  },
  {
    id: 'clay_playhouse',
    name: 'Claymation Stage',
    tagline: 'Tactile stop-motion matte clay depth with cozy miniature theatre lighting',
    accentHex: '#D97706',
    params: {
      smoothness: 0.88,
      outlineStrength: 0.18,
      saturation: 1.22,
      rimGlow: 0.52,
      toonBands: 7,
      warmth: 0.26,
    },
  },
  {
    id: 'storybook_cel',
    name: 'Storybook 3D Cel',
    tagline: 'Expressive animated outlines with crisp cel-shaded sunlight highlights',
    accentHex: '#0284C7',
    params: {
      smoothness: 0.68,
      outlineStrength: 0.64,
      saturation: 1.38,
      rimGlow: 0.45,
      toonBands: 6,
      warmth: 0.1,
    },
  },
  {
    id: 'toybox_pastel',
    name: 'Toybox Pastel 3D',
    tagline: 'Ultra-smooth soft-toy surfaces with cheerful bright storybook colors',
    accentHex: '#E11D48',
    params: {
      smoothness: 0.92,
      outlineStrength: 0.14,
      saturation: 1.28,
      rimGlow: 0.82,
      toonBands: 10,
      warmth: 0.22,
    },
  },
  {
    id: 'comic_drama',
    name: 'Pop Drama Stage',
    tagline: 'Bold Saturday-morning cartoon ink contours with lively theatrical pop',
    accentHex: '#4F46E5',
    params: {
      smoothness: 0.58,
      outlineStrength: 0.78,
      saturation: 1.5,
      rimGlow: 0.35,
      toonBands: 5,
      warmth: 0.06,
    },
  },
];

export const CHARACTER_CAST: CharacterProfile[] = [
  {
    id: 'pip',
    name: 'Pip',
    role: 'Brave Explorer',
    bio: 'Leads every backyard quest with his explorer hat, big grin, and trusty compass.',
    accentHex: '#EA580C',
    secondaryHex: '#FDE68A',
    defaultVoice: 'kids_hero',
    defaultProp: 'sunbeams',
    defaultAction: 'hero-jump',
    sampleLine: 'Whoa! Look what adventure is starting right here!',
  },
  {
    id: 'milo',
    name: 'Milo',
    role: 'Storybook Fox',
    bio: 'Quick-witted, tail-wagging woodland buddy who reacts to every funny twist.',
    accentHex: '#D97706',
    secondaryHex: '#FED7AA',
    defaultVoice: 'chipmunk',
    defaultProp: 'stars',
    defaultAction: 'bounce',
    sampleLine: 'Hehe! Bet you did not see that silly surprise coming!',
  },
  {
    id: 'luna',
    name: 'Luna',
    role: 'Star Fairy',
    bio: 'Sprinkles golden starlight across the playhouse whenever magic strikes the scene.',
    accentHex: '#9333EA',
    secondaryHex: '#F3E8FF',
    defaultVoice: 'fairy',
    defaultProp: 'sparkles',
    defaultAction: 'float',
    sampleLine: 'Twinkle wish! Watch the whole world turn magical!',
  },
  {
    id: 'barnaby',
    name: 'Barnaby',
    role: 'Toybox Robot',
    bio: 'Friendly retro-cute studio bot whose spring antenna bounces to every voice.',
    accentHex: '#0284C7',
    secondaryHex: '#BAE6FD',
    defaultVoice: 'robot',
    defaultProp: 'notes',
    defaultAction: 'dance',
    sampleLine: 'Beep-boop! Cartoon joy levels reaching one hundred percent!',
  },
  {
    id: 'coco',
    name: 'Coco',
    role: 'Panda Director',
    bio: 'Wears a tiny film beret and calls lights, camera, and giggles on every scene.',
    accentHex: '#0F172A',
    secondaryHex: '#E2E8F0',
    defaultVoice: 'narrator',
    defaultProp: 'curtains',
    defaultAction: 'wave',
    sampleLine: 'Lights, camera, giggles! Ready for the next scene!',
  },
  {
    id: 'sunny',
    name: 'Sunny',
    role: 'Little Prince',
    bio: 'Cheerful cardboard-castle royal with a bright crown and sweeping red play cape.',
    accentHex: '#DC2626',
    secondaryHex: '#FEF08A',
    defaultVoice: 'playful_kid',
    defaultProp: 'crown',
    defaultAction: 'hero-jump',
    sampleLine: 'By royal decree, today is official playtime!',
  },
  {
    id: 'bubu',
    name: 'Bubu',
    role: 'Baby Dragon',
    bio: 'Bouncy emerald dragon with tiny fluttering wings and a goofy friendly roar.',
    accentHex: '#16A34A',
    secondaryHex: '#BBF7D0',
    defaultVoice: 'giant_dragon',
    defaultProp: 'rainbow',
    defaultAction: 'bounce',
    sampleLine: 'Rawr-hehe! Even dragons love a happy story!',
  },
  {
    id: 'toto',
    name: 'Toto',
    role: 'Story Owl',
    bio: 'Gentle storybook narrator perched with oversized round glasses and big curiosity.',
    accentHex: '#7C3AED',
    secondaryHex: '#DDD6FE',
    defaultVoice: 'narrator',
    defaultProp: 'bubbles',
    defaultAction: 'peek',
    sampleLine: 'Hoo-hoo! Let us see what happens in the next chapter!',
  },
  {
    id: 'kiko',
    name: 'Kiko',
    role: 'Playful Monkey',
    bio: 'Energetic treetop acrobat with a bright red bandana and a bouncy curling tail.',
    accentHex: '#B45309',
    secondaryHex: '#FEF3C7',
    defaultVoice: 'goofy_clown',
    defaultProp: 'balloons',
    defaultAction: 'dance',
    sampleLine: 'Ooh-ooh! Jump right in, this scene is going bananas!',
  },
  {
    id: 'bella',
    name: 'Bella',
    role: 'Fluffy Bunny',
    bio: 'Sweet pastel storybook rabbit with tall flopping ears and a cheerful bow.',
    accentHex: '#DB2777',
    secondaryHex: '#FCE7F3',
    defaultVoice: 'sweet_princess',
    defaultProp: 'butterflies',
    defaultAction: 'bounce',
    sampleLine: 'Hop, hop, hooray! Every moment feels like spring!',
  },
  {
    id: 'zuzu',
    name: 'Zuzu',
    role: 'Space Kid',
    bio: 'Curious mini astronaut in a glossy bubble helmet exploring cartoon galaxies.',
    accentHex: '#2563EB',
    secondaryHex: '#DBEAFE',
    defaultVoice: 'playful_kid',
    defaultProp: 'stars',
    defaultAction: 'float',
    sampleLine: 'Blast off! Three, two, one, cartoon takeoff!',
  },
  {
    id: 'raju',
    name: 'Raju',
    role: 'Little Lion Cub',
    bio: 'Brave sunny lion cub with a fluffy golden mane and a giant cheerful smile.',
    accentHex: '#D97706',
    secondaryHex: '#FEF08A',
    defaultVoice: 'kids_hero',
    defaultProp: 'sunbeams',
    defaultAction: 'hero-jump',
    sampleLine: 'Roar! Time for the bravest cartoon hero moment!',
  },
  {
    id: 'mimi',
    name: 'Mimi',
    role: 'Dreamy Unicorn',
    bio: 'Sparkling unicorn friend with a golden spiral horn and rainbow mane tufts.',
    accentHex: '#C026D3',
    secondaryHex: '#FAE8FF',
    defaultVoice: 'fairy',
    defaultProp: 'rainbow',
    defaultAction: 'float',
    sampleLine: 'Rainbow magic! Look how bright this story shines!',
  },
  {
    id: 'pogo',
    name: 'Pogo',
    role: 'Frog Prince',
    bio: 'Silly hopping frog with a miniature crown who loves dramatic splashes and laughs.',
    accentHex: '#059669',
    secondaryHex: '#D1FAE5',
    defaultVoice: 'goofy_clown',
    defaultProp: 'bubbles',
    defaultAction: 'bounce',
    sampleLine: 'Ribbit! Hold on tight, here comes the funniest part!',
  },
  {
    id: 'nini',
    name: 'Nini',
    role: 'Kitty Chef',
    bio: 'Clever ginger kitten wearing a tall white chef hat, whipping up sweet surprises.',
    accentHex: '#E11D48',
    secondaryHex: '#FFE4E6',
    defaultVoice: 'sweet_princess',
    defaultProp: 'confetti',
    defaultAction: 'wave',
    sampleLine: 'Meow-velous! Cooking up a super tasty scene!',
  },
  {
    id: 'golu',
    name: 'Golu',
    role: 'Baby Elephant',
    bio: 'Kind-hearted sky-blue baby elephant with flapping ears and a joyful curling trunk.',
    accentHex: '#0284C7',
    secondaryHex: '#E0F2FE',
    defaultVoice: 'giant_dragon',
    defaultProp: 'confetti',
    defaultAction: 'dance',
    sampleLine: 'Toot-toot! Big smiles and big cheers for everyone!',
  },
];

export const VOICE_STYLES: VoiceStylePreset[] = [
  {
    id: 'dynamic_cast',
    name: 'Dynamic Cast Voices',
    description: 'Keeps original spoken language (Hindi, English, any) & auto-switches cartoon voice timbre every scene',
    pitchSemitones: 4.5,
    formantFreq: 1900,
    formantGainDb: 5.5,
    brightnessDb: 4,
    ringModHz: 0,
    shimmerMix: 0.12,
  },
  {
    id: 'kids_hero',
    name: 'Kids Drama Hero',
    description: 'Bright, energetic cartoon kid lead (+4.5 semitones, exact original words & speed)',
    pitchSemitones: 4.5,
    formantFreq: 2050,
    formantGainDb: 6,
    brightnessDb: 4.5,
    ringModHz: 0,
    shimmerMix: 0.06,
  },
  {
    id: 'playful_kid',
    name: 'Chota Cartoon Buddy',
    description: 'Cute animated child voice (+5.5 semitones, warm storybook clarity for Hindi/English)',
    pitchSemitones: 5.5,
    formantFreq: 2250,
    formantGainDb: 6.5,
    brightnessDb: 5,
    ringModHz: 0,
    shimmerMix: 0.08,
  },
  {
    id: 'chipmunk',
    name: 'Squeaky Chipmunk',
    description: 'Lively high-pitched cartoon woodland buddy (+8 semitones)',
    pitchSemitones: 8.0,
    formantFreq: 2650,
    formantGainDb: 8,
    brightnessDb: 6.5,
    ringModHz: 0,
    shimmerMix: 0.08,
  },
  {
    id: 'sweet_princess',
    name: 'Sweet Storybook Kid',
    description: 'Gentle cheerful cartoon voice (+3.5 semitones, soft sparkling tone)',
    pitchSemitones: 3.5,
    formantFreq: 2150,
    formantGainDb: 5,
    brightnessDb: 5.5,
    ringModHz: 0,
    shimmerMix: 0.18,
  },
  {
    id: 'fairy',
    name: 'Fairy Sparkle',
    description: 'Whimsical airy magical character voice (+6 semitones with shimmer)',
    pitchSemitones: 6.0,
    formantFreq: 2400,
    formantGainDb: 5.5,
    brightnessDb: 7.5,
    ringModHz: 0,
    shimmerMix: 0.3,
  },
  {
    id: 'goofy_clown',
    name: 'Goofy Cartoon Comic',
    description: 'Bouncy funny nasal cartoon sidekick timbre (+3 semitones)',
    pitchSemitones: 3.0,
    formantFreq: 1650,
    formantGainDb: 8.5,
    brightnessDb: 4,
    ringModHz: 0,
    shimmerMix: 0.05,
  },
  {
    id: 'robot',
    name: 'Toybox Robot',
    description: 'Quirky animated robot vocalizer keeping every spoken word clear',
    pitchSemitones: -1.5,
    formantFreq: 1350,
    formantGainDb: 6.5,
    brightnessDb: 3,
    ringModHz: 74,
    shimmerMix: 0.14,
  },
  {
    id: 'giant_dragon',
    name: 'Friendly Giant / Elephant',
    description: 'Warm, goofy deep cartoon voice (-4.5 semitones)',
    pitchSemitones: -4.5,
    formantFreq: 560,
    formantGainDb: 7,
    brightnessDb: -1.5,
    ringModHz: 0,
    shimmerMix: 0.04,
  },
  {
    id: 'narrator',
    name: 'Storybook Narrator',
    description: 'Polished kids-drama storyteller clarity (+2 semitones)',
    pitchSemitones: 2.0,
    formantFreq: 1550,
    formantGainDb: 4,
    brightnessDb: 3,
    ringModHz: 0,
    shimmerMix: 0.05,
  },
  {
    id: 'original',
    name: 'Original Voice (Bypass)',
    description: 'Keep original uploaded audio untouched without cartoon voice conversion',
    pitchSemitones: 0,
    formantFreq: 1000,
    formantGainDb: 0,
    brightnessDb: 0,
    ringModHz: 0,
    shimmerMix: 0,
  },
];

const SCENE_TITLES_EN = [
  'Grand Opening',
  'Playful Arrival',
  'Magic Sparkle Twist',
  'Robot Dance Beat',
  'Royal Adventure',
  'Funny Surprise',
  'Jungle Giggles',
  'Rainbow Wishes',
  'Space Takeoff',
  'Happy Finale',
  'Starlight Encore',
  'Storybook Bow',
  'Butterfly Parade',
  'Chef Surprise',
  'Elephant Cheers',
  'Hero Celebration',
];

const SCENE_TITLES_HI = [
  'शानदार शुरुआत',
  'मज़ेदार एंट्री',
  'जादुई ट्विस्ट',
  'रोबोट डांस',
  'शाही एडवेंचर',
  'हँसी का धमाका',
  'जंगल मस्ती',
  'इंद्रधनुष जादू',
  'अंतरिक्ष उड़ान',
  'धमाकेदार समापन',
  'तारों की चमक',
  'कहानी का हीरो',
  'तितली परेड',
  'मज़ेदार सरप्राइज़',
  'गज़ब की तालियाँ',
  'खुशियों का जश्न',
];

const CAPTIONS_EN = [
  'Curtains up! Welcome to our 3D cartoon playhouse!',
  'Whoa, look at that awesome moment right there!',
  'Twinkle magic! Something wonderful just happened!',
  'Beep-boop! Cartoon joy is at full power!',
  'By royal decree, let the adventure continue!',
  'Hehe! What a funny surprise in this scene!',
  'Ooh-ooh! Jump in, every second has a new friend!',
  'Rainbow cheer! Even baby dragons love this story!',
  'Three, two, one — cartoon rocket blast off!',
  'Toot-toot! Big smiles for the grand finale!',
  'Hop, hop, hooray! Butterflies are dancing too!',
  'Meow-velous! Cooking up the sweetest cartoon twist!',
  'Roar! Here comes the bravest hero moment!',
  'Ribbit! Hold tight, the funniest beat is here!',
  'Hoo-hoo! What an unforgettable chapter!',
  'Take a bow! Best kids drama show ever!',
];

const CAPTIONS_HI = [
  'पर्दा उठा! हमारे 3D कार्टून नाटक में स्वागत है!',
  'वाह! देखो कितना शानदार सीन शुरू हो गया!',
  'जादू की छड़ी! पूरी दुनिया रंगीन हो गई!',
  'बीप-बूप! मस्ती और हँसी फुल पावर पर है!',
  'शाही ऐलान! अब असली खेल शुरू होता है!',
  'हीही! इतना मज़ेदार सरप्राइज़ देखा क्या?',
  'उछल-कूद! हर सीन में एक नया कार्टून दोस्त!',
  'इंद्रधनुष जैसा जादू! सब मिलकर मुस्कुराओ!',
  'तीन, दो, एक — कार्टून रॉकेट की उड़ान!',
  'टूट-टूट! सबसे प्यारे Finale के लिए तालियाँ!',
  'हॉप-हॉप हुर्रे! तितलियाँ भी साथ नाच रही हैं!',
  'म्याऊँ-मस्त! अब आएगा सबसे प्यारा ट्विस्ट!',
  'दहाड़! देखो सबसे बहादुर हीरो आ गया!',
  'टर्र-टर्र! अब हँसी रुकने वाली नहीं है!',
  'हू-हू! कहानी का सबसे रोचक हिस्सा!',
  'तालियाँ! सबसे शानदार किड्स ड्रामा एपिसोड!',
];

const EMOTIONS_ORDER: CharacterEmotion[] = [
  'excited',
  'happy',
  'laughing',
  'curious',
  'heroic',
  'surprised',
];

const POSITIONS_ORDER: StagePosition[] = ['left', 'right', 'bottom-left', 'bottom-right'];

const PROPS_ORDER: StagePropId[] = [
  'curtains',
  'stars',
  'sparkles',
  'notes',
  'sunbeams',
  'balloons',
  'butterflies',
  'rainbow',
  'confetti',
  'crown',
  'bubbles',
];

const ACTIONS_ORDER: SceneActionStyle[] = [
  'hero-jump',
  'bounce',
  'float',
  'dance',
  'wave',
  'peek',
];

export function getCharacterById(id: CharacterId): CharacterProfile {
  return CHARACTER_CAST.find((c) => c.id === id) ?? CHARACTER_CAST[0];
}

export function getStyleById(id: string): AnimationStylePreset {
  return ANIMATION_STYLES.find((s) => s.id === id) ?? ANIMATION_STYLES[0];
}

export function getVoicePreset(id: string): VoiceStylePreset {
  return VOICE_STYLES.find((v) => v.id === id) ?? VOICE_STYLES[0];
}

/**
 * Generates a full-duration multi-character kids-drama storyboard across all 16 distinct characters.
 * Guarantees NO character repeats across consecutive scenes (and for <=16 scenes, ZERO repeats at all!).
 * Also adds an animated buddy co-star on every 3rd scene for richer multi-character kids drama.
 */
export function generateDefaultBeats(
  durationSec: number,
  beatLengthSec = 5,
  seedOffset = 0,
  language: VideoLanguageOption = 'auto'
): SceneBeat[] {
  const safeDuration = Math.max(4, durationSec);
  const safeBeatLen = Math.max(2.5, Math.min(12, beatLengthSec));
  const count = Math.max(2, Math.round(safeDuration / safeBeatLen));
  const actualSlice = safeDuration / count;

  const useHindiDefaults = language === 'Hindi';
  const titles = useHindiDefaults ? SCENE_TITLES_HI : SCENE_TITLES_EN;
  const captions = useHindiDefaults ? CAPTIONS_HI : CAPTIONS_EN;

  const beats: SceneBeat[] = [];
  let lastCharIdx = -1;

  for (let i = 0; i < count; i++) {
    let charIdx = (i + seedOffset) % CHARACTER_CAST.length;
    if (charIdx === lastCharIdx) {
      charIdx = (charIdx + 1) % CHARACTER_CAST.length;
    }
    lastCharIdx = charIdx;

    const char = CHARACTER_CAST[charIdx];
    // Add a lively second buddy character on alternating scenes for extra multi-character animation
    const hasBuddy = i % 2 === 1;
    const buddyIdx = (charIdx + 5) % CHARACTER_CAST.length;
    const buddyId: CharacterId | null = hasBuddy ? CHARACTER_CAST[buddyIdx].id : null;

    const startSec = Number((i * actualSlice).toFixed(2));
    const endSec = Number((i === count - 1 ? safeDuration : (i + 1) * actualSlice).toFixed(2));

    beats.push({
      id: `beat-${i + 1}-${seedOffset}`,
      sceneTitle: titles[(i + seedOffset) % titles.length],
      startSec,
      endSec,
      characterId: char.id,
      buddyCharacterId: buddyId,
      caption: captions[(i + seedOffset) % captions.length],
      emotion: EMOTIONS_ORDER[(i + seedOffset) % EMOTIONS_ORDER.length],
      action: char.defaultAction || ACTIONS_ORDER[i % ACTIONS_ORDER.length],
      prop: i === 0 ? 'curtains' : char.defaultProp || PROPS_ORDER[i % PROPS_ORDER.length],
      voiceStyle: char.defaultVoice as SingleVoiceStyleId,
      position: POSITIONS_ORDER[i % POSITIONS_ORDER.length],
    });
  }

  return beats;
}

export function shuffleBeatsCast(beats: SceneBeat[]): SceneBeat[] {
  const pool = [...CHARACTER_CAST];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let prevId: CharacterId | null = null;
  return beats.map((beat, idx) => {
    let candidate = pool[idx % pool.length];
    if (candidate.id === prevId) {
      candidate = pool[(idx + 1) % pool.length];
    }
    prevId = candidate.id;
    const buddyCandidate = pool[(idx + 6) % pool.length];
    const buddyId: CharacterId | null =
      idx % 2 === 1 && buddyCandidate.id !== candidate.id ? buddyCandidate.id : null;

    return {
      ...beat,
      characterId: candidate.id,
      buddyCharacterId: buddyId,
      voiceStyle: candidate.defaultVoice,
      prop: candidate.defaultProp,
      action: candidate.defaultAction,
      emotion: EMOTIONS_ORDER[(idx + Math.floor(Math.random() * 3)) % EMOTIONS_ORDER.length],
      position: POSITIONS_ORDER[idx % POSITIONS_ORDER.length],
    };
  });
}

export function findBeatAtTime(beats: SceneBeat[], timeSec: number): { beat: SceneBeat; index: number } | null {
  if (beats.length === 0) return null;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (timeSec >= b.startSec && (timeSec < b.endSec || i === beats.length - 1)) {
      return { beat: b, index: i };
    }
  }
  return { beat: beats[0], index: 0 };
}

export function formatTimecode(sec: number): string {
  const clamped = Math.max(0, Number.isFinite(sec) ? sec : 0);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const tenths = Math.floor((clamped % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}
