import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VALID_CHARACTERS = [
  'pip',
  'milo',
  'luna',
  'barnaby',
  'coco',
  'sunny',
  'bubu',
  'toto',
  'kiko',
  'bella',
  'zuzu',
  'raju',
  'mimi',
  'pogo',
  'nini',
  'golu',
];
const VALID_EMOTIONS = ['happy', 'excited', 'surprised', 'heroic', 'laughing', 'curious'];
const VALID_ACTIONS = ['bounce', 'dance', 'hero-jump', 'float', 'wave', 'peek'];
const VALID_PROPS = [
  'stars',
  'rainbow',
  'bubbles',
  'crown',
  'sparkles',
  'notes',
  'curtains',
  'sunbeams',
  'butterflies',
  'balloons',
  'confetti',
];
const VALID_VOICES = [
  'kids_hero',
  'playful_kid',
  'chipmunk',
  'sweet_princess',
  'fairy',
  'goofy_clown',
  'robot',
  'giant_dragon',
  'narrator',
];
const VALID_POSITIONS = ['left', 'right', 'bottom-left', 'bottom-right'];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: Boolean(createGeminiClient()) });
  });

  /**
   * Transcribes uploaded audio/video snippet in its EXACT original language
   * (Hindi -> Hindi, English -> English, any language -> same language) using gemini-3.5-transcribe
   * and identifies the spoken language name.
   */
  app.post('/api/detect-language', async (req, res) => {
    try {
      const ai = createGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API key is not configured in Settings > Secrets.',
        });
      }

      const { audioBase64, mimeType = 'audio/webm' } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };

      if (!audioBase64) {
        return res.status(400).json({ error: 'Audio data is required.' });
      }

      const transcribeRes = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            {
              text: 'Transcribe this audio verbatim in its exact original spoken language. Do NOT translate to another language.',
            },
          ],
        },
      });

      const transcript = (transcribeRes.text ?? '').trim();

      let detectedLanguage = 'English';
      if (transcript.length > 0) {
        const langRes = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Identify the primary spoken language of this transcript (e.g., Hindi, English, Hinglish, Punjabi, Bengali, Tamil, Telugu, Marathi, Urdu, Spanish, French, Arabic, Japanese, Korean). Return ONLY the single language name:\n\n"${transcript.slice(0, 600)}"`,
        });
        detectedLanguage = (langRes.text ?? 'English').trim().replace(/[^a-zA-Z\s-]/g, '') || 'English';
      }

      return res.json({
        detectedLanguage,
        transcript,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to detect language.';
      console.error('[detect-language] error:', message);
      return res.status(500).json({ error: message });
    }
  });

  /**
   * Analyzes sampled frames from an uploaded video (or photo) using gemini-4-hydrogen
   * and defines EVERY single scene across the full duration with 16 non-repeating 3D characters,
   * buddy co-stars, action choreography, stage props, and captions STRICTLY in the video's language!
   */
  app.post('/api/drama-director', async (req, res) => {
    try {
      const ai = createGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API key is not configured in Settings > Secrets.',
        });
      }

      const {
        frames = [],
        durationSeconds = 50,
        mediaType = 'video',
        styleName = '3D Kids Feature',
        beatDuration = 5,
        language = 'auto',
        transcriptHint = '',
      } = req.body as {
        frames?: string[];
        durationSeconds?: number;
        mediaType?: 'photo' | 'video';
        styleName?: string;
        beatDuration?: number;
        language?: string;
        transcriptHint?: string;
      };

      const safeDuration = Math.max(4, Math.min(600, Number(durationSeconds) || 50));
      const safeBeatLen = Math.max(2.5, Math.min(12, Number(beatDuration) || 5));
      const beatCount =
        mediaType === 'photo'
          ? 1
          : Math.max(3, Math.min(28, Math.round(safeDuration / safeBeatLen)));

      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

      const sampledFrames = Array.isArray(frames) ? frames.slice(0, 4) : [];
      for (const frameDataUrl of sampledFrames) {
        if (typeof frameDataUrl === 'string' && frameDataUrl.includes(',')) {
          const [meta, base64] = frameDataUrl.split(',');
          const mimeMatch = meta.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          if (base64 && base64.length > 100) {
            parts.push({
              inlineData: { mimeType, data: base64 },
            });
          }
        }
      }

      const languageRule =
        language && language !== 'auto'
          ? `Write ALL episodeTitle, sceneTitle, and caption strings STRICTLY in ${language}. Do NOT switch to another language.`
          : transcriptHint
          ? `Match the exact language of this original video transcript ("${transcriptHint.slice(0, 220)}") for ALL episodeTitle, sceneTitle, and caption strings. Never change the language.`
          : `Write episodeTitle, sceneTitle, and captions in natural, joyful English (or match any visible text language in the frame).`;

      parts.push({
        text: `You are a 3D Kids Play Drama Animation Director defining EVERY single scene for a ${mediaType} (${safeDuration.toFixed(1)} seconds total) rendered in "${styleName}" style.
Create EXACTLY ${beatCount} sequential scene definitions covering 0s to ${safeDuration.toFixed(1)}s.

CRITICAL RULES:
1. ${languageRule}
2. Pick from ALL 16 animated characters: ${VALID_CHARACTERS.join(', ')}. NEVER repeat the same characterId in consecutive scenes, and maximize variety across all 16 characters!
3. On alternating scenes, assign a DIFFERENT buddyCharacterId (from the same 16-character list, or empty string "" if solo) so multiple animated characters bring the kids drama to life!
4. Define a short 2–4 word sceneTitle, playful caption (max 9 words), emotion (${VALID_EMOTIONS.join(', ')}), action (${VALID_ACTIONS.join(', ')}), prop (${VALID_PROPS.join(', ')}), voiceStyle (${VALID_VOICES.join(', ')}), and position (${VALID_POSITIONS.join(', ')}) tailored to what is visible in the frames.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              episodeTitle: {
                type: Type.STRING,
                description: 'Playful 3 to 6 word title in the target language.',
              },
              beats: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneTitle: { type: Type.STRING },
                    characterId: { type: Type.STRING },
                    buddyCharacterId: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    emotion: { type: Type.STRING },
                    action: { type: Type.STRING },
                    prop: { type: Type.STRING },
                    voiceStyle: { type: Type.STRING },
                    position: { type: Type.STRING },
                  },
                  required: [
                    'sceneTitle',
                    'characterId',
                    'buddyCharacterId',
                    'caption',
                    'emotion',
                    'action',
                    'prop',
                    'voiceStyle',
                    'position',
                  ],
                },
              },
            },
            required: ['episodeTitle', 'beats'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        episodeTitle?: string;
        beats?: Array<{
          sceneTitle: string;
          characterId: string;
          buddyCharacterId?: string;
          caption: string;
          emotion: string;
          action: string;
          prop: string;
          voiceStyle: string;
          position: string;
        }>;
      };

      const rawBeats = Array.isArray(parsed.beats) ? parsed.beats : [];
      const sliceDuration = safeDuration / beatCount;
      let prevChar = '';

      const normalizedBeats = Array.from({ length: beatCount }, (_, i) => {
        const src = rawBeats[i];
        let charId = VALID_CHARACTERS.includes(src?.characterId)
          ? src.characterId
          : VALID_CHARACTERS[i % VALID_CHARACTERS.length];

        if (charId === prevChar) {
          const nextIdx = (VALID_CHARACTERS.indexOf(charId) + 1) % VALID_CHARACTERS.length;
          charId = VALID_CHARACTERS[nextIdx];
        }
        prevChar = charId;

        const rawBuddy = src?.buddyCharacterId || '';
        const buddyCharacterId =
          VALID_CHARACTERS.includes(rawBuddy) && rawBuddy !== charId
            ? rawBuddy
            : i % 2 === 1
            ? VALID_CHARACTERS[(VALID_CHARACTERS.indexOf(charId) + 5) % VALID_CHARACTERS.length]
            : null;

        const emotion = VALID_EMOTIONS.includes(src?.emotion)
          ? src.emotion
          : VALID_EMOTIONS[i % VALID_EMOTIONS.length];
        const action = VALID_ACTIONS.includes(src?.action)
          ? src.action
          : VALID_ACTIONS[i % VALID_ACTIONS.length];
        const prop = VALID_PROPS.includes(src?.prop)
          ? src.prop
          : VALID_PROPS[i % VALID_PROPS.length];
        const voiceStyle = VALID_VOICES.includes(src?.voiceStyle)
          ? src.voiceStyle
          : VALID_VOICES[i % VALID_VOICES.length];
        const position = VALID_POSITIONS.includes(src?.position)
          ? src.position
          : VALID_POSITIONS[i % VALID_POSITIONS.length];

        const startSec = Number((i * sliceDuration).toFixed(2));
        const endSec = Number((i === beatCount - 1 ? safeDuration : (i + 1) * sliceDuration).toFixed(2));

        return {
          id: `beat-${i + 1}`,
          sceneTitle: (src?.sceneTitle || `Scene ${i + 1}`).slice(0, 42),
          startSec,
          endSec,
          characterId: charId,
          buddyCharacterId,
          caption: (src?.caption || 'Adventure time on the playhouse stage!').slice(0, 88),
          emotion,
          action,
          prop,
          voiceStyle,
          position,
        };
      });

      return res.json({
        episodeTitle: parsed.episodeTitle || 'Playhouse Cartoon Adventure',
        beats: normalizedBeats,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate drama plan.';
      console.error('[drama-director] error:', message);
      return res.status(500).json({ error: message });
    }
  });

  /**
   * Generates animated character WAV voiceover strictly in the requested/original language
   * (Hindi -> Hindi, English -> English, any language -> same language!) using gemini-3.8-flash-tts.
   */
  app.post('/api/cartoon-voiceover', async (req, res) => {
    try {
      const ai = createGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API key is not configured in Settings > Secrets.',
        });
      }

      const {
        lines = [],
        mode = 'duo',
        voiceStyle = 'kids_hero',
        language = 'auto',
      } = req.body as {
        lines?: Array<{ speaker: string; text: string; style?: string }>;
        mode?: 'single' | 'duo';
        voiceStyle?: string;
        language?: string;
      };

      const cleanedLines = Array.isArray(lines)
        ? lines
            .filter((l) => l && typeof l.text === 'string' && l.text.trim().length > 0)
            .slice(0, 8)
        : [];

      if (cleanedLines.length === 0) {
        return res.status(400).json({ error: 'At least one dialogue line is required.' });
      }

      const langDirective =
        language && language !== 'auto'
          ? `Speak naturally and authentically in ${language} with native cartoon pronunciation, never translating to another language.`
          : 'Speak in the exact language of the provided text without translating.';

      if (mode === 'duo' && cleanedLines.length >= 2) {
        const speakerA = 'Pip';
        const speakerB = 'Luna';

        const parts = cleanedLines.map((line, index) => {
          const isA = index % 2 === 0;
          const speaker = isA ? speakerA : speakerB;
          const flair = index === 0 ? '<laugh> ' : index % 3 === 1 ? '<gasp> ' : '';
          return {
            text: `${speaker}: ${flair}${line.text.trim()}`,
            speechMetadata: {
              speaker,
              style: isA
                ? `Cheerful, bouncy animated kid hero in a 3D kids play drama. ${langDirective}`
                : `Sparkly, playful animated storybook fairy friend in a kids cartoon show. ${langDirective}`,
            },
          };
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [{ role: 'user', parts }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: speakerA,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                  },
                  {
                    speaker: speakerB,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                  },
                ],
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          return res.status(502).json({ error: 'Voice model returned no audio data.' });
        }

        return res.json({
          mimeType: 'audio/wav',
          audioBase64: base64Audio,
        });
      }

      const styleMap: Record<string, { voiceName: string; styleDesc: string }> = {
        kids_hero: {
          voiceName: 'Puck',
          styleDesc: `Energetic, joyful animated kid adventure hero in a 3D cartoon show. ${langDirective}`,
        },
        playful_kid: {
          voiceName: 'Puck',
          styleDesc: `Cute, lively young cartoon child character full of excitement. ${langDirective}`,
        },
        chipmunk: {
          voiceName: 'Puck',
          styleDesc: `High-spirited, super-cute fast-talking cartoon woodland buddy. ${langDirective}`,
        },
        sweet_princess: {
          voiceName: 'Zephyr',
          styleDesc: `Sweet, cheerful animated storybook kid character. ${langDirective}`,
        },
        fairy: {
          voiceName: 'Zephyr',
          styleDesc: `Whimsical, musical animated star fairy narrator for a kids storybook. ${langDirective}`,
        },
        goofy_clown: {
          voiceName: 'Puck',
          styleDesc: `Funny, bouncy comedic cartoon sidekick full of giggles. ${langDirective}`,
        },
        robot: {
          voiceName: 'Charon',
          styleDesc: `Playful, friendly toybox cartoon robot with quirky rhythmic cadence. ${langDirective}`,
        },
        giant_dragon: {
          voiceName: 'Fenrir',
          styleDesc: `Warm, goofy, booming friendly baby dragon character in a kids animation. ${langDirective}`,
        },
        narrator: {
          voiceName: 'Kore',
          styleDesc: `Expressive animated kids playhouse storyteller full of wonder and delight. ${langDirective}`,
        },
      };

      const selected = styleMap[voiceStyle] || styleMap.kids_hero;
      const combinedText = cleanedLines.map((l) => l.text.trim()).join(' ... ');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `<laugh> ${combinedText}`,
                speechMetadata: {
                  style: selected.styleDesc,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selected.voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(502).json({ error: 'Voice model returned no audio data.' });
      }

      return res.json({
        mimeType: 'audio/wav',
        audioBase64: base64Audio,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to synthesize cartoon voice.';
      console.error('[cartoon-voiceover] error:', message);
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ToonStage server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
