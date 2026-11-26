import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Download,
  Film,
  Image as ImageIcon,
  SplitSquareHorizontal,
  Sparkles,
  Wand2,
  RotateCcw,
  Sliders,
  Mic,
  Users,
  X,
  CheckCircle2,
  Languages,
} from 'lucide-react';
import {
  AnimationStyleId,
  CartoonShaderParams,
  CharacterEmotion,
  CharacterId,
  ExportState,
  MediaAsset,
  SceneActionStyle,
  SceneBeat,
  SingleVoiceStyleId,
  StagePosition,
  StagePropId,
  VideoLanguageOption,
  VoiceStyleId,
} from '../types/studio';
import {
  ANIMATION_STYLES,
  CHARACTER_CAST,
  VIDEO_LANGUAGES,
  VOICE_STYLES,
  findBeatAtTime,
  formatTimecode,
  generateDefaultBeats,
  getCharacterById,
  getStyleById,
  shuffleBeatsCast,
} from '../engine/presets';
import { CartoonWebGLRenderer } from '../engine/cartoonShader';
import { drawDramaStageOverlay } from '../engine/characters';
import { CartoonVoiceEngine } from '../engine/cartoonVoice';
import {
  SAMPLE_MEDIA_ITEMS,
  SamplePresetItem,
  createPlayhouseDemoAudioUrl,
} from '../engine/sampleMedia';
import { SceneTimeline } from './SceneTimeline';
import { CharacterAvatar } from './CharacterAvatar';

interface StudioWorkspaceProps {
  voiceEngine: CartoonVoiceEngine;
  pendingFile: File | null;
  onConsumePendingFile: () => void;
  pendingSample: SamplePresetItem | null;
  onConsumePendingSample: () => void;
  pendingCharacterToAssign: CharacterId | null;
  onConsumePendingCharacter: () => void;
  onTriggerGlobalUpload: () => void;
}

type InspectorTab = 'visual' | 'voice' | 'cast';

const EMOTIONS: CharacterEmotion[] = ['happy', 'excited', 'laughing', 'heroic', 'curious', 'surprised'];
const ACTIONS: { id: SceneActionStyle; label: string }[] = [
  { id: 'hero-jump', label: 'Hero Jump' },
  { id: 'bounce', label: 'Bouncy' },
  { id: 'dance', label: 'Dance' },
  { id: 'float', label: 'Magic Float' },
  { id: 'wave', label: 'Cheer Wave' },
  { id: 'peek', label: 'Playful Peek' },
];
const PROPS: StagePropId[] = [
  'curtains',
  'stars',
  'sparkles',
  'rainbow',
  'bubbles',
  'notes',
  'butterflies',
  'balloons',
  'confetti',
  'crown',
  'sunbeams',
];
const POSITIONS: { id: StagePosition; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'bottom-left', label: 'Lower Left' },
  { id: 'bottom-right', label: 'Lower Right' },
];

export function StudioWorkspace({
  voiceEngine,
  pendingFile,
  onConsumePendingFile,
  pendingSample,
  onConsumePendingSample,
  pendingCharacterToAssign,
  onConsumePendingCharacter,
  onTriggerGlobalUpload,
}: StudioWorkspaceProps) {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Style & shader tuning
  const [styleId, setStyleId] = useState<AnimationStyleId>('pixar_3d');
  const [shaderParams, setShaderParams] = useState<CartoonShaderParams>(ANIMATION_STYLES[0].params);
  const [dramaOverlayEnabled, setDramaOverlayEnabled] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [showSceneBanner, setShowSceneBanner] = useState(true);

  // Before/After split compare
  const [compareSplit, setCompareSplit] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const isDraggingSplitRef = useRef(false);

  // Voice & Original Language Preservation settings (Video Mode)
  const [videoLanguage, setVideoLanguage] = useState<VideoLanguageOption>('auto');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyleId>('dynamic_cast');
  const [pitchOffset, setPitchOffset] = useState(0);
  const [brightnessBoost, setBrightnessBoost] = useState(0);
  const [effectMix, setEffectMix] = useState(1);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [muted, setMuted] = useState(false);

  // Optional Same-Language AI Dubbing state (Video Mode)
  const [aiDubUrl, setAiDubUrl] = useState<string | null>(null);
  const [useAiDubbing, setUseAiDubbing] = useState(false);
  const [aiDubMode, setAiDubMode] = useState<'duo' | 'single'>('duo');
  const [isGeneratingDub, setIsGeneratingDub] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Timeline & Cast state
  const [beatLengthSec, setBeatLengthSec] = useState(5);
  const [beats, setBeats] = useState<SceneBeat[]>(() => generateDefaultBeats(50, 5));
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [episodeTitle, setEpisodeTitle] = useState('Kids Playhouse Adventure');
  const [isDirectingAi, setIsDirectingAi] = useState(false);

  // Playback state (Video Mode only)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('visual');

  // Export state
  const [exportState, setExportState] = useState<ExportState>({
    status: 'idle',
    progress: 0,
    currentSec: 0,
    totalSec: 0,
    outputUrl: null,
    outputName: '',
    outputKind: 'video',
  });

  // DOM & Engine refs
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawStageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const webglRendererRef = useRef<CartoonWebGLRenderer | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const secondaryPhotoImgRef = useRef<HTMLImageElement | null>(null);
  const demoAudioElRef = useRef<HTMLAudioElement | null>(null);
  const aiAudioElRef = useRef<HTMLAudioElement | null>(null);
  const demoAudioUrlRef = useRef<string | null>(null);

  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const lastFramePerfRef = useRef(0);
  const lastActiveBeatIndexRef = useRef(-1);
  const exportRecorderRef = useRef<MediaRecorder | null>(null);
  const exportCancelledRef = useRef(false);
  const isExportingRef = useRef(false);

  const isPhotoMode = media?.kind === 'photo';
  const isVideoMode = media?.kind === 'video';

  // If user switches to photo mode while on the Voice tab, move cleanly to Visual tab
  useEffect(() => {
    if (isPhotoMode && inspectorTab === 'voice') {
      setInspectorTab('visual');
    }
  }, [isPhotoMode, inspectorTab]);

  const stateRef = useRef({
    media,
    shaderParams,
    dramaOverlayEnabled,
    showCaptions,
    showProps,
    showSceneBanner,
    compareSplit,
    splitRatio,
    voiceStyle,
    pitchOffset,
    brightnessBoost,
    effectMix,
    sfxEnabled,
    beats,
    useAiDubbing,
  });

  useEffect(() => {
    stateRef.current = {
      media,
      shaderParams,
      dramaOverlayEnabled,
      showCaptions,
      showProps,
      showSceneBanner,
      compareSplit,
      splitRatio,
      voiceStyle,
      pitchOffset,
      brightnessBoost,
      effectMix,
      sfxEnabled,
      beats,
      useAiDubbing,
    };
  }, [
    media,
    shaderParams,
    dramaOverlayEnabled,
    showCaptions,
    showProps,
    showSceneBanner,
    compareSplit,
    splitRatio,
    voiceStyle,
    pitchOffset,
    brightnessBoost,
    effectMix,
    sfxEnabled,
    beats,
    useAiDubbing,
  ]);

  // Apply real-time cartoon voice DSP whenever audio controls change (Video Mode)
  useEffect(() => {
    if (!isVideoMode) return;
    const activeBeatInfo = findBeatAtTime(beats, currentTime);
    const resolvedStyle: SingleVoiceStyleId =
      voiceStyle === 'dynamic_cast'
        ? activeBeatInfo?.beat.voiceStyle ?? 'kids_hero'
        : voiceStyle;
    voiceEngine.applyVoiceStyle(resolvedStyle, {
      pitchOffsetSemitones: pitchOffset,
      brightnessBoostDb: brightnessBoost,
      effectMix,
    });
  }, [isVideoMode, voiceStyle, pitchOffset, brightnessBoost, effectMix, beats, currentTime, voiceEngine]);

  useEffect(() => {
    voiceEngine.setVolume(muted ? 0 : 1);
  }, [muted, voiceEngine]);

  useEffect(() => {
    return () => {
      webglRendererRef.current?.dispose();
      if (demoAudioUrlRef.current) URL.revokeObjectURL(demoAudioUrlRef.current);
    };
  }, []);

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    videoElRef.current?.pause();
    demoAudioElRef.current?.pause();
    aiAudioElRef.current?.pause();
  }, []);

  /**
   * Loads a PHOTO strictly in Photo-Only 3D Cartoon Mode (no video conversion, no video timeline).
   */
  const loadPhotoOnly = useCallback(
    (url: string, name: string, isSample = false) => {
      stopPlayback();
      setErrorBanner(null);
      setStatusNotice(null);
      setAiDubUrl(null);
      setUseAiDubbing(false);
      secondaryPhotoImgRef.current = null;
      setExportState({
        status: 'idle',
        progress: 0,
        currentSec: 0,
        totalSec: 0,
        outputUrl: null,
        outputName: '',
        outputKind: 'photo',
      });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        photoImgRef.current = img;
        const asset: MediaAsset = {
          kind: 'photo',
          name,
          url,
          width: img.naturalWidth || 1280,
          height: img.naturalHeight || 720,
          duration: 0,
          isSample,
          isDemoReel: false,
        };
        setMedia(asset);
        currentTimeRef.current = 0;
        setCurrentTime(0);

        const singleBeat = generateDefaultBeats(5, 5, 0, videoLanguage).slice(0, 1);
        setBeats(singleBeat);
        setSelectedBeatId(singleBeat[0]?.id ?? null);
        setEpisodeTitle('3D Cartoon Photo');
        setStatusNotice('Photo mode active — converts your photo directly into a 3D cartoon photo (PNG/JPG).');
      };
      img.onerror = () => {
        setErrorBanner('Could not load that photo. Please try a JPG, PNG, or WebP image.');
      };
      img.src = url;
    },
    [stopPlayback, videoLanguage]
  );

  /**
   * Loads the 50s Multi-Character Demo Reel in Video Mode so users can test full 50s scene rotation & voice DSP immediately.
   */
  const loadDemoVideoReel = useCallback(
    (sample: SamplePresetItem) => {
      stopPlayback();
      setErrorBanner(null);
      setStatusNotice(null);
      setAiDubUrl(null);
      setUseAiDubbing(false);
      setExportState({
        status: 'idle',
        progress: 0,
        currentSec: 0,
        totalSec: 0,
        outputUrl: null,
        outputName: '',
        outputKind: 'video',
      });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        photoImgRef.current = img;
        if (sample.secondaryImageUrl) {
          const img2 = new Image();
          img2.crossOrigin = 'anonymous';
          img2.onload = () => {
            secondaryPhotoImgRef.current = img2;
          };
          img2.src = sample.secondaryImageUrl;
        } else {
          secondaryPhotoImgRef.current = null;
        }

        const asset: MediaAsset = {
          kind: 'video',
          name: sample.label,
          url: sample.imageUrl,
          width: img.naturalWidth || 1280,
          height: img.naturalHeight || 720,
          duration: sample.duration,
          isSample: true,
          isDemoReel: true,
        };
        setMedia(asset);
        currentTimeRef.current = 0;
        setCurrentTime(0);

        const generated = generateDefaultBeats(sample.duration, beatLengthSec, 0, videoLanguage);
        setBeats(generated);
        setSelectedBeatId(generated[0]?.id ?? null);
        setEpisodeTitle(sample.label);

        if (demoAudioUrlRef.current) URL.revokeObjectURL(demoAudioUrlRef.current);
        const wavUrl = createPlayhouseDemoAudioUrl(sample.duration);
        demoAudioUrlRef.current = wavUrl;
        if (demoAudioElRef.current) {
          demoAudioElRef.current.src = wavUrl;
          demoAudioElRef.current.currentTime = 0;
        }
      };
      img.src = sample.imageUrl;
    },
    [beatLengthSec, stopPlayback, videoLanguage]
  );

  /**
   * Loads any user-uploaded PHOTO (strictly Photo Mode) or VIDEO (strictly Full-Duration Video Mode).
   */
  const loadUploadedFile = useCallback(
    (file: File) => {
      stopPlayback();
      setErrorBanner(null);
      setStatusNotice(null);
      setAiDubUrl(null);
      setUseAiDubbing(false);
      secondaryPhotoImgRef.current = null;

      const objectUrl = URL.createObjectURL(file);

      if (file.type.startsWith('image/')) {
        loadPhotoOnly(objectUrl, file.name, false);
        return;
      }

      if (file.type.startsWith('video/')) {
        const videoEl = videoElRef.current;
        if (!videoEl) return;

        setExportState({
          status: 'idle',
          progress: 0,
          currentSec: 0,
          totalSec: 0,
          outputUrl: null,
          outputName: '',
          outputKind: 'video',
        });

        videoEl.src = objectUrl;
        videoEl.load();

        const onLoadedMetadata = () => {
          const dur = Number.isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : 15;
          const asset: MediaAsset = {
            kind: 'video',
            name: file.name,
            url: objectUrl,
            width: videoEl.videoWidth || 1280,
            height: videoEl.videoHeight || 720,
            duration: dur,
            isSample: false,
            isDemoReel: false,
          };
          setMedia(asset);
          currentTimeRef.current = 0;
          setCurrentTime(0);
          videoEl.currentTime = 0;

          const idealBeatLen = dur >= 40 ? 5 : dur >= 20 ? 4 : 3;
          setBeatLengthSec(idealBeatLen);
          const generated = generateDefaultBeats(dur, idealBeatLen, 0, videoLanguage);
          setBeats(generated);
          setSelectedBeatId(generated[0]?.id ?? null);
          setEpisodeTitle(file.name.replace(/\.[^/.]+$/, '') + ' — Kids Cartoon Drama');
          setStatusNotice(
            `Loaded ${dur.toFixed(1)}s video with ${generated.length} defined scenes. Original spoken audio language (Hindi, English, or any language) is preserved and converted to cartoon character voices in real time.`
          );
        };

        const onError = () => {
          setErrorBanner('Unable to decode this video format in browser. Try MP4, WebM, or MOV.');
        };

        videoEl.onloadedmetadata = onLoadedMetadata;
        videoEl.onerror = onError;
        return;
      }

      setErrorBanner('Please upload a supported photo (JPG, PNG, WebP) or video (MP4, WebM, MOV).');
    },
    [loadPhotoOnly, stopPlayback, videoLanguage]
  );

  // Consume external triggers
  useEffect(() => {
    if (pendingFile) {
      loadUploadedFile(pendingFile);
      onConsumePendingFile();
    }
  }, [pendingFile, loadUploadedFile, onConsumePendingFile]);

  useEffect(() => {
    if (pendingSample) {
      if (pendingSample.kind === 'photo') {
        loadPhotoOnly(pendingSample.imageUrl, pendingSample.label, true);
      } else {
        loadDemoVideoReel(pendingSample);
      }
      onConsumePendingSample();
    }
  }, [pendingSample, loadPhotoOnly, loadDemoVideoReel, onConsumePendingSample]);

  useEffect(() => {
    if (pendingCharacterToAssign) {
      setBeats((prev) => {
        if (prev.length === 0) return prev;
        const targetId = selectedBeatId || prev[0].id;
        const char = getCharacterById(pendingCharacterToAssign);
        return prev.map((b) =>
          b.id === targetId
            ? {
                ...b,
                characterId: char.id,
                voiceStyle: char.defaultVoice,
                prop: char.defaultProp,
                action: char.defaultAction,
              }
            : b
        );
      });
      setInspectorTab('cast');
      setStatusNotice(`Assigned ${getCharacterById(pendingCharacterToAssign).name} to the active scene.`);
      onConsumePendingCharacter();
    }
  }, [pendingCharacterToAssign, selectedBeatId, onConsumePendingCharacter]);

  // Initial default sample on mount (50s Multi-Character Demo Video)
  const hasAutoLoadedRef = useRef(false);
  useEffect(() => {
    if (!hasAutoLoadedRef.current && !media && !pendingFile && !pendingSample) {
      hasAutoLoadedRef.current = true;
      loadDemoVideoReel(SAMPLE_MEDIA_ITEMS[2]);
    }
  }, [media, pendingFile, pendingSample, loadDemoVideoReel]);

  const stageDimensions = useMemo(() => {
    if (!media) return { w: 1280, h: 720 };
    const aspect = media.width / Math.max(1, media.height);
    const maxW = 1280;
    const maxH = 720;
    let w = maxW;
    let h = Math.round(w / aspect);
    if (h > maxH) {
      h = maxH;
      w = Math.round(h * aspect);
    }
    return { w: Math.max(320, w - (w % 2)), h: Math.max(240, h - (h % 2)) };
  }, [media]);

  /**
   * Renders a single composite frame (raw -> WebGL2 3D Cartoon -> Kids Drama Cast Overlay -> Optional Compare Split)
   */
  const renderFrameAt = useCallback(
    (timeSec: number, hideSplitForExport = false) => {
      const displayCanvas = displayCanvasRef.current;
      const st = stateRef.current;
      if (!displayCanvas || !st.media) return;

      const { w, h } = stageDimensions;
      if (displayCanvas.width !== w || displayCanvas.height !== h) {
        displayCanvas.width = w;
        displayCanvas.height = h;
      }

      if (!rawStageCanvasRef.current) {
        rawStageCanvasRef.current = document.createElement('canvas');
      }
      const rawCanvas = rawStageCanvasRef.current;
      if (rawCanvas.width !== w || rawCanvas.height !== h) {
        rawCanvas.width = w;
        rawCanvas.height = h;
      }
      const rawCtx = rawCanvas.getContext('2d');
      const dispCtx = displayCanvas.getContext('2d');
      if (!rawCtx || !dispCtx) return;

      // 1. Draw source media into rawCanvas
      if (st.media.kind === 'video' && !st.media.isDemoReel) {
        const videoEl = videoElRef.current;
        if (videoEl && videoEl.readyState >= 2) {
          rawCtx.drawImage(videoEl, 0, 0, w, h);
        }
      } else {
        const primaryImg = photoImgRef.current;
        const secondaryImg = secondaryPhotoImgRef.current;
        if (primaryImg && primaryImg.complete) {
          const isAnimatedDemo = st.media.kind === 'video' && st.media.isDemoReel;
          const zoom =
            isAnimatedDemo && (isPlayingRef.current || isExportingRef.current)
              ? 1.0 + 0.06 * (0.5 + 0.5 * Math.sin(timeSec * 0.45))
              : 1.0;
          const panX =
            isAnimatedDemo && (isPlayingRef.current || isExportingRef.current)
              ? Math.sin(timeSec * 0.35) * w * 0.02
              : 0;
          const panY =
            isAnimatedDemo && (isPlayingRef.current || isExportingRef.current)
              ? Math.cos(timeSec * 0.28) * h * 0.015
              : 0;

          const useSecond =
            isAnimatedDemo && secondaryImg && secondaryImg.complete && Math.floor(timeSec / 10) % 2 === 1;
          const activeImg = useSecond ? secondaryImg : primaryImg;

          rawCtx.save();
          rawCtx.clearRect(0, 0, w, h);
          const imgAspect = activeImg.naturalWidth / Math.max(1, activeImg.naturalHeight);
          const canvasAspect = w / h;
          let drawW = w * zoom;
          let drawH = h * zoom;
          if (imgAspect > canvasAspect) {
            drawH = h * zoom;
            drawW = drawH * imgAspect;
          } else {
            drawW = w * zoom;
            drawH = drawW / imgAspect;
          }
          rawCtx.drawImage(activeImg, (w - drawW) / 2 + panX, (h - drawH) / 2 + panY, drawW, drawH);
          rawCtx.restore();
        }
      }

      // 2. Process through WebGL2 3D Cartoon Shader Engine
      if (!webglRendererRef.current) {
        webglRendererRef.current = new CartoonWebGLRenderer(w, h);
      }
      const cartoonCanvas = webglRendererRef.current.render(rawCanvas, st.shaderParams, w, h);

      // 3. Draw 3D Cartoon frame
      dispCtx.clearRect(0, 0, w, h);
      dispCtx.drawImage(cartoonCanvas, 0, 0, w, h);

      // 4. Composite Kids Play Drama 3D Character Cast + Buddy + Props + Scene Banner + Caption
      const beatInfo = findBeatAtTime(st.beats, timeSec);
      if (st.dramaOverlayEnabled && beatInfo) {
        const staticPhoto = st.media.kind === 'photo';
        const liveAudio = staticPhoto
          ? 0.14
          : isPlayingRef.current || isExportingRef.current
          ? Math.max(voiceEngine.getLiveAudioLevel(), 0.14 + 0.12 * Math.sin(timeSec * 9))
          : 0.1;

        drawDramaStageOverlay(dispCtx, w, h, {
          beat: beatInfo.beat,
          sceneIndex: beatInfo.index,
          timeSec: staticPhoto ? 1.4 : timeSec,
          audioLevel: liveAudio,
          showCaptions: st.showCaptions,
          showProps: st.showProps,
          showSceneBanner: !staticPhoto && st.showSceneBanner,
          isStaticPhoto: staticPhoto,
        });
      }

      // 5. Optional Before / After interactive split overlay
      if (st.compareSplit && !hideSplitForExport) {
        const splitX = Math.round(w * st.splitRatio);
        dispCtx.save();
        dispCtx.beginPath();
        dispCtx.rect(0, 0, splitX, h);
        dispCtx.clip();
        dispCtx.drawImage(rawCanvas, 0, 0, w, h);
        dispCtx.restore();

        dispCtx.save();
        dispCtx.fillStyle = '#FFFFFF';
        dispCtx.fillRect(splitX - 1.5, 0, 3, h);

        dispCtx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        dispCtx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        dispCtx.beginPath();
        dispCtx.roundRect(14, 14, 78, 28, 6);
        dispCtx.fill();
        dispCtx.fillStyle = '#FFFFFF';
        dispCtx.fillText('Original', 28, 32);

        dispCtx.fillStyle = 'rgba(234, 88, 12, 0.9)';
        dispCtx.beginPath();
        dispCtx.roundRect(w - 118, 14, 104, 28, 6);
        dispCtx.fill();
        dispCtx.fillStyle = '#FFFFFF';
        dispCtx.fillText('3D Cartoon', w - 102, 32);
        dispCtx.restore();
      }
    },
    [stageDimensions, voiceEngine]
  );

  // Main real-time render loop
  useEffect(() => {
    let rafId = 0;

    const loop = (now: number) => {
      const st = stateRef.current;
      if (st.media) {
        let t = currentTimeRef.current;

        if (st.media.kind === 'video' && isPlayingRef.current) {
          if (!st.media.isDemoReel && videoElRef.current) {
            t = videoElRef.current.currentTime;
            if (videoElRef.current.ended || t >= st.media.duration) {
              if (isExportingRef.current) {
                t = st.media.duration;
              } else {
                videoElRef.current.currentTime = 0;
                t = 0;
                videoElRef.current.play().catch(() => {});
              }
            }
          } else {
            const dt = lastFramePerfRef.current ? Math.min(0.1, (now - lastFramePerfRef.current) / 1000) : 0.016;
            t += dt;
            if (t >= st.media.duration) {
              if (isExportingRef.current) {
                t = st.media.duration;
              } else {
                t = 0;
                if (demoAudioElRef.current && !st.useAiDubbing) {
                  demoAudioElRef.current.currentTime = 0;
                  demoAudioElRef.current.play().catch(() => {});
                }
                if (aiAudioElRef.current && st.useAiDubbing) {
                  aiAudioElRef.current.currentTime = 0;
                  aiAudioElRef.current.play().catch(() => {});
                }
              }
            }
          }

          currentTimeRef.current = t;
          setCurrentTime(t);

          const beatInfo = findBeatAtTime(st.beats, t);
          if (beatInfo && beatInfo.index !== lastActiveBeatIndexRef.current) {
            const prevIdx = lastActiveBeatIndexRef.current;
            lastActiveBeatIndexRef.current = beatInfo.index;

            if (st.voiceStyle === 'dynamic_cast') {
              voiceEngine.applyVoiceStyle(beatInfo.beat.voiceStyle, {
                pitchOffsetSemitones: st.pitchOffset,
                brightnessBoostDb: st.brightnessBoost,
                effectMix: st.effectMix,
              });
            }
            if (prevIdx !== -1 && st.sfxEnabled && st.dramaOverlayEnabled) {
              voiceEngine.playCartoonTransitionSfx(beatInfo.index);
            }
          }
        }

        lastFramePerfRef.current = now;
        renderFrameAt(t, isExportingRef.current);
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [renderFrameAt, voiceEngine]);

  const startPlayback = useCallback(async () => {
    if (!media || media.kind !== 'video') return;
    await voiceEngine.ensureInitialized();

    const activeBeat = findBeatAtTime(beats, currentTimeRef.current);
    const resolvedVoice: SingleVoiceStyleId =
      voiceStyle === 'dynamic_cast' ? activeBeat?.beat.voiceStyle ?? 'kids_hero' : voiceStyle;
    voiceEngine.applyVoiceStyle(resolvedVoice, {
      pitchOffsetSemitones: pitchOffset,
      brightnessBoostDb: brightnessBoost,
      effectMix,
    });

    if (!media.isDemoReel && videoElRef.current) {
      await voiceEngine.attachMediaElement(videoElRef.current);
      if (useAiDubbing && aiAudioElRef.current && aiDubUrl) {
        videoElRef.current.muted = true;
        await voiceEngine.attachMediaElement(aiAudioElRef.current);
        aiAudioElRef.current.currentTime =
          currentTimeRef.current % Math.max(1, aiAudioElRef.current.duration || 10);
        aiAudioElRef.current.play().catch(() => {});
      } else {
        // Default: keep original video audio (Hindi, English, any language!) transformed through cartoon voice DSP
        videoElRef.current.muted = false;
      }
      await videoElRef.current.play().catch(() => {});
    } else if (media.isDemoReel) {
      if (useAiDubbing && aiAudioElRef.current && aiDubUrl) {
        await voiceEngine.attachMediaElement(aiAudioElRef.current);
        aiAudioElRef.current.currentTime = 0;
        aiAudioElRef.current.play().catch(() => {});
      } else if (demoAudioElRef.current && demoAudioUrlRef.current) {
        await voiceEngine.attachMediaElement(demoAudioElRef.current);
        demoAudioElRef.current.currentTime = Math.min(
          currentTimeRef.current,
          Math.max(0, (demoAudioElRef.current.duration || media.duration) - 0.1)
        );
        demoAudioElRef.current.play().catch(() => {});
      }
    }

    lastFramePerfRef.current = performance.now();
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [media, beats, voiceStyle, pitchOffset, brightnessBoost, effectMix, useAiDubbing, aiDubUrl, voiceEngine]);

  const togglePlay = () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  const seekTo = useCallback(
    (sec: number) => {
      if (!media || media.kind !== 'video') return;
      const clamped = Math.max(0, Math.min(media.duration, sec));
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
      lastActiveBeatIndexRef.current = -1;

      if (!media.isDemoReel && videoElRef.current) {
        videoElRef.current.currentTime = clamped;
      }
      if (media.isDemoReel && demoAudioElRef.current && !useAiDubbing) {
        demoAudioElRef.current.currentTime = Math.min(
          clamped,
          demoAudioElRef.current.duration || clamped
        );
      }
      if (aiAudioElRef.current && useAiDubbing && aiDubUrl) {
        aiAudioElRef.current.currentTime = Math.min(
          clamped,
          aiAudioElRef.current.duration || clamped
        );
      }
    },
    [media, useAiDubbing, aiDubUrl]
  );

  const handleStyleSelect = (id: AnimationStyleId) => {
    setStyleId(id);
    setShaderParams({ ...getStyleById(id).params });
  };

  const handleChangeBeatLength = (newLen: number) => {
    setBeatLengthSec(newLen);
    if (!media || media.kind !== 'video') return;
    const regenerated = generateDefaultBeats(media.duration, newLen, 0, videoLanguage);
    setBeats(regenerated);
    setSelectedBeatId(regenerated[0]?.id ?? null);
  };

  const handleLanguageChange = (nextLang: VideoLanguageOption) => {
    setVideoLanguage(nextLang);
    if (media?.kind === 'video') {
      const updated = generateDefaultBeats(media.duration, beatLengthSec, 0, nextLang);
      setBeats(updated);
      setSelectedBeatId(updated[0]?.id ?? null);
      setStatusNotice(
        nextLang === 'auto'
          ? 'Language set to Auto — original video audio language is preserved verbatim.'
          : `Scene language set to ${nextLang}. Original audio stays in ${nextLang} and AI scene definitions will write strictly in ${nextLang}.`
      );
    }
  };

  const handleUpdateSelectedBeat = (patch: Partial<SceneBeat>) => {
    const targetId = selectedBeatId || beats[0]?.id;
    if (!targetId) return;
    setBeats((prev) => prev.map((b) => (b.id === targetId ? { ...b, ...patch } : b)));
  };

  /**
   * Samples visual frames and calls server-side Gemini 4 Hydrogen AI Drama Director
   * to define EVERY scene in the exact chosen/detected video language across all 16 characters.
   */
  const handleRunAiDirector = async () => {
    if (!media) return;
    setIsDirectingAi(true);
    setErrorBanner(null);
    setStatusNotice(null);

    try {
      const sampleFrames: string[] = [];
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = 480;
      captureCanvas.height = Math.round((480 * stageDimensions.h) / stageDimensions.w);
      const cctx = captureCanvas.getContext('2d');

      if (cctx) {
        if ((media.kind === 'photo' || media.isDemoReel) && photoImgRef.current) {
          cctx.drawImage(photoImgRef.current, 0, 0, captureCanvas.width, captureCanvas.height);
          sampleFrames.push(captureCanvas.toDataURL('image/jpeg', 0.72));
          if (secondaryPhotoImgRef.current) {
            cctx.drawImage(secondaryPhotoImgRef.current, 0, 0, captureCanvas.width, captureCanvas.height);
            sampleFrames.push(captureCanvas.toDataURL('image/jpeg', 0.72));
          }
        } else if (media.kind === 'video' && videoElRef.current) {
          const vid = videoElRef.current;
          const wasPlaying = isPlayingRef.current;
          if (wasPlaying) stopPlayback();

          const origTime = vid.currentTime;
          const ratios = [0.1, 0.35, 0.65, 0.88];
          for (const r of ratios) {
            const targetT = Math.min(media.duration - 0.1, Math.max(0, media.duration * r));
            await new Promise<void>((resolve) => {
              const onSeeked = () => {
                vid.removeEventListener('seeked', onSeeked);
                resolve();
              };
              vid.addEventListener('seeked', onSeeked);
              vid.currentTime = targetT;
            });
            cctx.drawImage(vid, 0, 0, captureCanvas.width, captureCanvas.height);
            sampleFrames.push(captureCanvas.toDataURL('image/jpeg', 0.7));
          }
          vid.currentTime = origTime;
        }
      }

      const res = await fetch('/api/drama-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: sampleFrames,
          durationSeconds: media.kind === 'photo' ? 5 : media.duration,
          mediaType: media.kind,
          styleName: getStyleById(styleId).name,
          beatDuration: beatLengthSec,
          language: videoLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Scene Director failed.');
      }

      if (Array.isArray(data.beats) && data.beats.length > 0) {
        setBeats(data.beats);
        setSelectedBeatId(data.beats[0].id);
        setEpisodeTitle(data.episodeTitle || 'Kids Playhouse Adventure');
        setStatusNotice(
          media.kind === 'photo'
            ? `Styled photo cast & caption in ${videoLanguage === 'auto' ? 'matching language' : videoLanguage}.`
            : `Defined all ${data.beats.length} scenes for "${data.episodeTitle}" using rotating 16-character cast.`
        );
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Could not run AI Scene Director.');
    } finally {
      setIsDirectingAi(false);
    }
  };

  /**
   * Optional Same-Language AI Cartoon Voiceover (strictly preserves selected language — Hindi stays Hindi, English stays English)
   */
  const handleGenerateAiDubbing = async () => {
    if (beats.length === 0) return;
    setIsGeneratingDub(true);
    setErrorBanner(null);
    setStatusNotice(null);

    try {
      const lines = beats.slice(0, 6).map((b) => {
        const char = getCharacterById(b.characterId);
        return {
          speaker: char.name,
          text: b.caption,
          style: char.role,
        };
      });

      const res = await fetch('/api/cartoon-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: aiDubMode,
          voiceStyle:
            voiceStyle === 'dynamic_cast' || voiceStyle === 'original' ? 'playful_kid' : voiceStyle,
          language: videoLanguage,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI voiceover synthesis failed.');
      }

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      if (aiDubUrl) URL.revokeObjectURL(aiDubUrl);
      setAiDubUrl(url);
      setUseAiDubbing(true);

      if (aiAudioElRef.current) {
        aiAudioElRef.current.src = url;
        aiAudioElRef.current.load();
      }
      setStatusNotice(
        `Same-language (${videoLanguage === 'auto' ? 'original' : videoLanguage}) cartoon voice dub synthesized.`
      );
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to generate AI cartoon dubbing.');
    } finally {
      setIsGeneratingDub(false);
    }
  };

  /**
   * Instant High-Resolution 3D Cartoon Photo Export (PNG or JPG)
   */
  const handleDownloadCartoonPhoto = (format: 'png' | 'jpeg' = 'png') => {
    if (!displayCanvasRef.current || !media) return;
    renderFrameAt(currentTimeRef.current, true);
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = displayCanvasRef.current.toDataURL(mime, 0.94);
    const cleanBase = media.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-');
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const fileName = `${cleanBase}-3d-cartoon.${ext}`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();

    setExportState({
      status: 'done',
      progress: 1,
      currentSec: 0,
      totalSec: 0,
      outputUrl: dataUrl,
      outputName: fileName,
      outputKind: 'photo',
    });
  };

  /**
   * Full-Duration High-Quality 3D Cartoon Video Export (.webm with converted original-language cartoon voice muxed!)
   */
  const handleExportFullVideo = async () => {
    if (!media || media.kind !== 'video' || !displayCanvasRef.current) return;
    if (isExportingRef.current) return;

    stopPlayback();
    setErrorBanner(null);
    exportCancelledRef.current = false;
    isExportingRef.current = true;

    const totalSec = media.duration;
    setExportState({
      status: 'rendering',
      progress: 0,
      currentSec: 0,
      totalSec,
      outputUrl: null,
      outputName: '',
      outputKind: 'video',
    });

    try {
      await voiceEngine.ensureInitialized();
      const canvas = displayCanvasRef.current;

      currentTimeRef.current = 0;
      setCurrentTime(0);
      lastActiveBeatIndexRef.current = -1;

      if (!media.isDemoReel && videoElRef.current) {
        videoElRef.current.currentTime = 0;
        await voiceEngine.attachMediaElement(videoElRef.current);
      }

      if (useAiDubbing && aiAudioElRef.current && aiDubUrl) {
        await voiceEngine.attachMediaElement(aiAudioElRef.current);
        aiAudioElRef.current.currentTime = 0;
      } else if (media.isDemoReel && demoAudioElRef.current && demoAudioUrlRef.current) {
        await voiceEngine.attachMediaElement(demoAudioElRef.current);
        demoAudioElRef.current.currentTime = 0;
      }

      const canvasStream = canvas.captureStream(30);
      const audioStream = voiceEngine.getExportAudioStream();
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioStream) {
        combinedTracks.push(...audioStream.getAudioTracks());
      }
      const combinedStream = new MediaStream(combinedTracks);

      const mimeOptions = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const chosenMime = mimeOptions.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(combinedStream, {
        ...(chosenMime ? { mimeType: chosenMime } : {}),
        videoBitsPerSecond: 6_500_000,
        audioBitsPerSecond: 128_000,
      });
      exportRecorderRef.current = recorder;

      const recordedChunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
      };

      const finishPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: chosenMime || 'video/webm' });
          resolve(blob);
        };
        recorder.onerror = () => reject(new Error('Video recording encoder encountered an error.'));
      });

      recorder.start(250);
      await startPlayback();

      await new Promise<void>((resolve) => {
        const poll = window.setInterval(() => {
          const cur = currentTimeRef.current;
          const pct = Math.min(1, cur / Math.max(0.1, totalSec));
          setExportState((prev) => ({
            ...prev,
            progress: pct,
            currentSec: cur,
          }));

          const videoEnded =
            !media.isDemoReel && videoElRef.current
              ? videoElRef.current.ended || videoElRef.current.currentTime >= totalSec - 0.05
              : cur >= totalSec - 0.04;

          if (exportCancelledRef.current || videoEnded) {
            clearInterval(poll);
            resolve();
          }
        }, 100);
      });

      stopPlayback();
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      const finalBlob = await finishPromise;

      if (exportCancelledRef.current) {
        setExportState({
          status: 'idle',
          progress: 0,
          currentSec: 0,
          totalSec: 0,
          outputUrl: null,
          outputName: '',
          outputKind: 'video',
        });
        return;
      }

      const outUrl = URL.createObjectURL(finalBlob);
      const cleanBase = media.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-');
      const fileName = `${cleanBase}-${Math.round(totalSec)}s-3d-cartoon.webm`;

      setExportState({
        status: 'done',
        progress: 1,
        currentSec: totalSec,
        totalSec,
        outputUrl: outUrl,
        outputName: fileName,
        outputKind: 'video',
      });
    } catch (err: unknown) {
      stopPlayback();
      setExportState({
        status: 'error',
        progress: 0,
        currentSec: 0,
        totalSec: 0,
        outputUrl: null,
        outputName: '',
        outputKind: 'video',
        errorMessage: err instanceof Error ? err.message : 'Export failed.',
      });
    } finally {
      isExportingRef.current = false;
      exportRecorderRef.current = null;
    }
  };

  const handleCancelExport = () => {
    exportCancelledRef.current = true;
    stopPlayback();
    if (exportRecorderRef.current && exportRecorderRef.current.state !== 'inactive') {
      exportRecorderRef.current.stop();
    }
  };

  const updateSplitFromPointer = (clientX: number) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    setSplitRatio(Math.max(0.05, Math.min(0.95, ratio)));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadUploadedFile(file);
  };

  const activeBeatInfo = findBeatAtTime(beats, currentTime);
  const selectedBeat = beats.find((b) => b.id === selectedBeatId) ?? activeBeatInfo?.beat ?? null;
  const activeCharProfile = activeBeatInfo ? getCharacterById(activeBeatInfo.beat.characterId) : null;
  const activeBuddyProfile =
    activeBeatInfo?.beat.buddyCharacterId
      ? getCharacterById(activeBeatInfo.beat.buddyCharacterId)
      : null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <video ref={videoElRef} playsInline crossOrigin="anonymous" className="hidden" />
      <audio ref={demoAudioElRef} crossOrigin="anonymous" className="hidden" />
      <audio ref={aiAudioElRef} crossOrigin="anonymous" className="hidden" />

      {/* Top Metadata & Quick Sample Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-900">
            {media ? media.name : 'Upload Photo or Video'}
          </span>
          {media && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-orange-700">
                {isPhotoMode ? 'Photo → 3D Cartoon Photo Only' : `Video → Full ${media.duration.toFixed(1)}s 3D Cartoon Video`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {stageDimensions.w}×{stageDimensions.h}
              </span>
              {isVideoMode && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{beats.length} Defined Scenes</span>
                  <span aria-hidden="true">·</span>
                  <span>Original Audio Language Preserved</span>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 mr-1">Try sample:</span>
          {SAMPLE_MEDIA_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                item.kind === 'photo'
                  ? loadPhotoOnly(item.imageUrl, item.label, true)
                  : loadDemoVideoReel(item)
              }
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {item.kind === 'photo'
                ? item.id === 'sample-park'
                  ? 'Photo: Backyard'
                  : 'Photo: Crown Kids'
                : 'Video: 50s Multi-Cast'}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Studio Stage + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Dominant 3D Cartoon Viewport */}
        <div className="lg:col-span-8 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDrop}
            className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
              isDraggingFile ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
            }`}
          >
            <div className="relative bg-slate-950 aspect-video w-full flex items-center justify-center overflow-hidden select-none">
              {media ? (
                <>
                  <canvas
                    ref={displayCanvasRef}
                    onPointerDown={(e) => {
                      if (!compareSplit) return;
                      isDraggingSplitRef.current = true;
                      updateSplitFromPointer(e.clientX);
                    }}
                    onPointerMove={(e) => {
                      if (compareSplit && isDraggingSplitRef.current) {
                        updateSplitFromPointer(e.clientX);
                      }
                    }}
                    onPointerUp={() => {
                      isDraggingSplitRef.current = false;
                    }}
                    onPointerLeave={() => {
                      isDraggingSplitRef.current = false;
                    }}
                    className={`max-w-full max-h-full w-auto h-auto object-contain block ${
                      compareSplit ? 'cursor-ew-resize' : ''
                    }`}
                  />

                  {compareSplit && (
                    <div
                      style={{ left: `${splitRatio * 100}%` }}
                      className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center border border-slate-300"
                    >
                      <SplitSquareHorizontal className="w-4 h-4" />
                    </div>
                  )}

                  {exportState.status === 'rendering' && (
                    <div className="absolute inset-x-4 bottom-4 bg-slate-950/90 text-white rounded-xl p-4 border border-white/15 backdrop-blur-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            Rendering Full {exportState.totalSec.toFixed(1)}s 3D Cartoon Video
                          </p>
                          <p className="text-xs text-slate-300 font-mono tabular-nums mt-0.5">
                            {formatTimecode(exportState.currentSec)} / {formatTimecode(exportState.totalSec)} ·{' '}
                            {Math.round(exportState.progress * 100)}% · Cast:{' '}
                            {activeCharProfile?.name ?? 'Pip'}
                            {activeBuddyProfile ? ` + ${activeBuddyProfile.name}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelExport}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden mt-3">
                        <div
                          className="h-full bg-orange-500 transition-all duration-100"
                          style={{ width: `${Math.round(exportState.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-10 text-center max-w-md">
                  <Upload className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                  <h2 className="text-lg font-bold text-white">Drop a Photo or Video Here</h2>
                  <p className="text-xs text-slate-300 mt-1.5">
                    Photos convert directly into 3D cartoon photos (PNG/JPG). Videos convert into full-duration 3D cartoon animations with 16 rotating characters and original-language cartoon voices.
                  </p>
                  <button
                    type="button"
                    onClick={onTriggerGlobalUpload}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg cursor-pointer"
                  >
                    Choose Photo or Video
                  </button>
                </div>
              )}
            </div>

            {/* Viewport Footer Bar: Strict Photo Toolbar vs. Video Transport Bar */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white flex flex-col gap-2.5">
              {isVideoMode && media && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono tabular-nums text-slate-600 w-14 shrink-0">
                    {formatTimecode(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.1, media.duration)}
                    step={0.1}
                    value={Math.min(currentTime, media.duration)}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    disabled={exportState.status === 'rendering'}
                    className="studio-slider flex-1"
                    aria-label="Video timeline scrubber"
                  />
                  <span className="text-xs font-mono tabular-nums text-slate-500 w-14 text-right shrink-0">
                    {formatTimecode(media.duration)}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                {isVideoMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!media || exportState.status === 'rendering'}
                      onClick={togglePlay}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? 'Pause Video' : 'Play 3D Cartoon Video'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => seekTo(0)}
                      disabled={!media || exportState.status === 'rendering'}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Restart from 00:00"
                      aria-label="Restart from beginning"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMuted((m) => !m)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={muted ? 'Unmute audio' : 'Mute audio'}
                      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                    >
                      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {activeCharProfile && dramaOverlayEnabled && (
                      <span className="hidden sm:inline text-xs text-slate-500 ml-1">
                        Scene {activeBeatInfo ? activeBeatInfo.index + 1 : 1}:{' '}
                        <strong className="text-slate-800">
                          {activeCharProfile.name}
                          {activeBuddyProfile ? ` + ${activeBuddyProfile.name}` : ''}
                        </strong>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <ImageIcon className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>
                      <strong>3D Cartoon Photo Mode</strong> — live GPU rendering ready for instant PNG/JPG download
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompareSplit((c) => !c)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      compareSplit
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SplitSquareHorizontal className="w-3.5 h-3.5" />
                    <span>Before / After</span>
                  </button>

                  <button
                    type="button"
                    onClick={onTriggerGlobalUpload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {errorBanner && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-xl">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-red-600 hover:text-red-800 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {statusNotice && !errorBanner && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl">
              <span>{statusNotice}</span>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {exportState.status === 'done' && exportState.outputUrl && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {exportState.outputKind === 'video'
                      ? `Full ${exportState.totalSec.toFixed(1)}s 3D Cartoon Video Ready`
                      : 'High-Resolution 3D Cartoon Photo Ready'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {exportState.outputName} ·{' '}
                    {exportState.outputKind === 'video'
                      ? 'Original audio language preserved & converted into animated cartoon voices'
                      : 'Crisp sculpted 3D cartoon image ready to save'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={exportState.outputUrl}
                  download={exportState.outputName}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {exportState.outputKind === 'video' ? 'Video' : 'Photo'}</span>
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setExportState((prev) => ({ ...prev, status: 'idle', outputUrl: null }))
                  }
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  aria-label="Close export summary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Studio Controls Inspector */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className={`grid gap-1 p-1 bg-slate-100 rounded-xl ${isPhotoMode ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <button
                type="button"
                onClick={() => setInspectorTab('visual')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  inspectorTab === 'visual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>3D Style</span>
              </button>

              {isVideoMode && (
                <button
                  type="button"
                  onClick={() => setInspectorTab('voice')}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    inspectorTab === 'voice'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setInspectorTab('cast')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  inspectorTab === 'cast'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isPhotoMode ? 'Photo Cast' : 'Scene Edit'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-5 max-h-[550px] overflow-y-auto">
            {inspectorTab === 'visual' && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-2.5">
                    3D Cartoon Rendering Preset
                  </h3>
                  <div className="space-y-2">
                    {ANIMATION_STYLES.map((preset) => {
                      const active = styleId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleStyleSelect(preset.id)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                            active
                              ? 'border-orange-500 bg-orange-50/70'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: preset.accentHex }}
                              aria-hidden="true"
                            />
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {preset.tagline}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-900">Sculpt & Lighting Controls</h3>

                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>3D Surface Smoothness</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(shaderParams.smoothness * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={shaderParams.smoothness}
                      onChange={(e) =>
                        setShaderParams((p) => ({ ...p, smoothness: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Cartoon Ink Outlines</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(shaderParams.outlineStrength * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={shaderParams.outlineStrength}
                      onChange={(e) =>
                        setShaderParams((p) => ({ ...p, outlineStrength: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>3D Rim Glow & Bounce</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(shaderParams.rimGlow * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={shaderParams.rimGlow}
                      onChange={(e) =>
                        setShaderParams((p) => ({ ...p, rimGlow: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Color Vibrancy</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(shaderParams.saturation * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.85}
                      max={1.75}
                      step={0.05}
                      value={shaderParams.saturation}
                      onChange={(e) =>
                        setShaderParams((p) => ({ ...p, saturation: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-900">
                    {isPhotoMode ? 'Photo Cartoon Framing' : 'Kids Play Drama Stage'}
                  </h3>
                  <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                    <span>
                      {isPhotoMode ? 'Include 3D Cartoon Co-Star(s)' : 'Rotating 16-Character Cast'}
                    </span>
                    <input
                      type="checkbox"
                      checked={dramaOverlayEnabled}
                      onChange={(e) => setDramaOverlayEnabled(e.target.checked)}
                      className="accent-orange-600 w-4 h-4 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                    <span>Storybook Speech Captions</span>
                    <input
                      type="checkbox"
                      checked={showCaptions}
                      onChange={(e) => setShowCaptions(e.target.checked)}
                      className="accent-orange-600 w-4 h-4 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                    <span>Animated Stage Props</span>
                    <input
                      type="checkbox"
                      checked={showProps}
                      onChange={(e) => setShowProps(e.target.checked)}
                      className="accent-orange-600 w-4 h-4 rounded"
                    />
                  </label>
                  {isVideoMode && (
                    <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                      <span>Show Scene Number Banner</span>
                      <input
                        type="checkbox"
                        checked={showSceneBanner}
                        onChange={(e) => setShowSceneBanner(e.target.checked)}
                        className="accent-orange-600 w-4 h-4 rounded"
                      />
                    </label>
                  )}
                </div>
              </>
            )}

            {inspectorTab === 'voice' && isVideoMode && (
              <>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Languages className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Original Audio Language Preserved</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Hindi stays Hindi, English stays English, and any spoken language keeps its exact original words while converting live into cartoon character audio at 1.0x speed.
                  </p>
                  <select
                    aria-label="Video spoken language"
                    value={videoLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value as VideoLanguageOption)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg"
                  >
                    {VIDEO_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-2">
                    Animated Character Voice Style
                  </h3>
                  <div className="space-y-1.5">
                    {VOICE_STYLES.map((preset) => {
                      const active = voiceStyle === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setVoiceStyle(preset.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                            active
                              ? 'border-orange-500 bg-orange-50/70'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                            <span className="text-[11px] font-mono tabular-nums text-slate-500">
                              {preset.id === 'dynamic_cast'
                                ? 'Auto per scene'
                                : `${preset.pitchSemitones > 0 ? '+' : ''}${preset.pitchSemitones} st`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Pitch Shift Offset</span>
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
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Voice Clarity & Brightness</span>
                      <span className="font-mono tabular-nums">
                        {brightnessBoost > 0 ? `+${brightnessBoost}` : brightnessBoost} dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-4}
                      max={8}
                      step={1}
                      value={brightnessBoost}
                      onChange={(e) => setBrightnessBoost(Number(e.target.value))}
                      className="studio-slider w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Cartoon Voice Mix</span>
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

                  <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer pt-1">
                    <span>Play Cartoon Pop SFX on Scene Switch</span>
                    <input
                      type="checkbox"
                      checked={sfxEnabled}
                      onChange={(e) => setSfxEnabled(e.target.checked)}
                      className="accent-orange-600 w-4 h-4 rounded"
                    />
                  </label>
                </div>

                {/* Optional Same-Language AI Cartoon Dubbing */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900">
                      Optional Same-Language AI Dub
                    </h3>
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                      <button
                        type="button"
                        onClick={() => setAiDubMode('duo')}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                          aiDubMode === 'duo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        2 Voices
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiDubMode('single')}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                          aiDubMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Solo
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Leave off to keep your video&apos;s own spoken voice converted directly. Turn on only if you want synthesized dialogue read in{' '}
                    <strong>{videoLanguage === 'auto' ? 'the scene language' : videoLanguage}</strong>.
                  </p>
                  <button
                    type="button"
                    disabled={isGeneratingDub}
                    onClick={handleGenerateAiDubbing}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>
                      {isGeneratingDub ? 'Synthesizing...' : 'Generate Optional Same-Language Dub'}
                    </span>
                  </button>

                  {aiDubUrl && (
                    <label className="flex items-center justify-between text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 cursor-pointer">
                      <span>Replace Video Audio with AI Dub</span>
                      <input
                        type="checkbox"
                        checked={useAiDubbing}
                        onChange={(e) => setUseAiDubbing(e.target.checked)}
                        className="accent-emerald-600 w-4 h-4 rounded"
                      />
                    </label>
                  )}
                </div>
              </>
            )}

            {inspectorTab === 'cast' && selectedBeat && (
              <>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <CharacterAvatar
                    characterId={selectedBeat.characterId}
                    size={56}
                    animated={isVideoMode}
                    emotion={selectedBeat.emotion}
                    audioLevel={0.3}
                  />
                  <div className="min-w-0">
                    {isVideoMode && (
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        {formatTimecode(selectedBeat.startSec)} – {formatTimecode(selectedBeat.endSec)}
                      </p>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {getCharacterById(selectedBeat.characterId).name} —{' '}
                      {getCharacterById(selectedBeat.characterId).role}
                    </h3>
                    {selectedBeat.buddyCharacterId && (
                      <p className="text-[11px] text-orange-700 font-medium">
                        Buddy Co-Star: {getCharacterById(selectedBeat.buddyCharacterId).name}
                      </p>
                    )}
                  </div>
                </div>

                {isVideoMode && (
                  <div>
                    <label
                      htmlFor="scene-title-input"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Scene Title
                    </label>
                    <input
                      id="scene-title-input"
                      type="text"
                      value={selectedBeat.sceneTitle}
                      onChange={(e) => handleUpdateSelectedBeat({ sceneTitle: e.target.value })}
                      className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-2">
                    Lead 3D Character (16 Characters)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CHARACTER_CAST.map((c) => {
                      const active = selectedBeat.characterId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            handleUpdateSelectedBeat({
                              characterId: c.id,
                              voiceStyle: c.defaultVoice,
                              prop: c.defaultProp,
                              action: c.defaultAction,
                            })
                          }
                          className={`flex flex-col items-center p-1.5 rounded-xl border transition-colors cursor-pointer ${
                            active
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <CharacterAvatar characterId={c.id} size={36} emotion="happy" />
                          <span className="text-[10px] font-semibold text-slate-800 mt-1 truncate max-w-full">
                            {c.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="buddy-char-select"
                    className="block text-xs font-semibold text-slate-800 mb-1"
                  >
                    Second Buddy Co-Star (Opposite Corner)
                  </label>
                  <select
                    id="buddy-char-select"
                    value={selectedBeat.buddyCharacterId || ''}
                    onChange={(e) =>
                      handleUpdateSelectedBeat({
                        buddyCharacterId: (e.target.value as CharacterId) || null,
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="">Solo Character (No Buddy)</option>
                    {CHARACTER_CAST.filter((c) => c.id !== selectedBeat.characterId).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="beat-caption-input"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Speech Bubble Text (Hindi, English, or Any Language)
                  </label>
                  <textarea
                    id="beat-caption-input"
                    rows={2}
                    value={selectedBeat.caption}
                    onChange={(e) => handleUpdateSelectedBeat({ caption: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="beat-emotion-select"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Expression
                    </label>
                    <select
                      id="beat-emotion-select"
                      value={selectedBeat.emotion}
                      onChange={(e) =>
                        handleUpdateSelectedBeat({ emotion: e.target.value as CharacterEmotion })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg capitalize"
                    >
                      {EMOTIONS.map((em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="beat-prop-select"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Stage Prop
                    </label>
                    <select
                      id="beat-prop-select"
                      value={selectedBeat.prop}
                      onChange={(e) =>
                        handleUpdateSelectedBeat({ prop: e.target.value as StagePropId })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg capitalize"
                    >
                      {PROPS.map((pr) => (
                        <option key={pr} value={pr}>
                          {pr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isVideoMode && (
                  <div>
                    <label
                      htmlFor="beat-action-select"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Character Animation Motion
                    </label>
                    <select
                      id="beat-action-select"
                      value={selectedBeat.action}
                      onChange={(e) =>
                        handleUpdateSelectedBeat({ action: e.target.value as SceneActionStyle })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    >
                      {ACTIONS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Stage Corner
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => handleUpdateSelectedBeat({ position: pos.id })}
                        className={`py-1.5 px-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          selectedBeat.position === pos.id
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isDirectingAi}
                  onClick={handleRunAiDirector}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isDirectingAi
                      ? 'Directing...'
                      : isPhotoMode
                      ? 'AI Pick Photo Cast & Caption'
                      : 'AI Auto-Define All Scenes'}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Strict Mode-Specific Export Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2.5 mt-auto">
            {isPhotoMode ? (
              <>
                <button
                  type="button"
                  onClick={() => handleDownloadCartoonPhoto('png')}
                  disabled={!media}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Download 3D Cartoon Photo (PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCartoonPhoto('jpeg')}
                  disabled={!media}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 3D Cartoon Photo (JPG)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleExportFullVideo}
                  disabled={!media || exportState.status === 'rendering'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap tabular-nums"
                >
                  <Film className="w-4 h-4" />
                  <span>
                    {exportState.status === 'rendering'
                      ? `Rendering ${Math.round(exportState.progress * 100)}%...`
                      : `Render Full ${media ? media.duration.toFixed(1) : '0.0'}s 3D Cartoon Video`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCartoonPhoto('png')}
                  disabled={!media || exportState.status === 'rendering'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Save Current Frame as PNG</span>
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Multi-Character Scene Storyboard Timeline (Strictly Video Mode Only!) */}
      {isVideoMode && media && (
        <SceneTimeline
          beats={beats}
          currentTime={currentTime}
          duration={media.duration}
          selectedBeatId={selectedBeat?.id ?? null}
          beatLengthSec={beatLengthSec}
          language={videoLanguage}
          isDirectingAi={isDirectingAi}
          episodeTitle={episodeTitle}
          onSelectBeat={(beat) => {
            setSelectedBeatId(beat.id);
            seekTo(beat.startSec + 0.05);
            setInspectorTab('cast');
          }}
          onChangeBeatLength={handleChangeBeatLength}
          onChangeLanguage={handleLanguageChange}
          onShuffleCast={() => {
            setBeats((prev) => shuffleBeatsCast(prev));
            setStatusNotice('Shuffled all 16 animated characters across every defined scene.');
          }}
          onRunAiDirector={handleRunAiDirector}
        />
      )}
    </section>
  );
}
