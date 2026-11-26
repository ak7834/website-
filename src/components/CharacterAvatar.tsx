import { useEffect, useRef } from 'react';
import { CharacterEmotion, CharacterId } from '../types/studio';
import { drawCharacterPortrait } from '../engine/characters';

interface CharacterAvatarProps {
  characterId: CharacterId;
  size?: number;
  animated?: boolean;
  emotion?: CharacterEmotion;
  audioLevel?: number;
  className?: string;
}

export function CharacterAvatar({
  characterId,
  size = 64,
  animated = false,
  emotion = 'happy',
  audioLevel = 0.12,
  className = '',
}: CharacterAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!animated) {
      drawCharacterPortrait(ctx, characterId, size, size, 1.2, audioLevel, emotion);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCharacterPortrait(ctx, characterId, size, size, t, audioLevel, emotion);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [characterId, size, animated, emotion, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={`rounded-xl shrink-0 block ${className}`}
      aria-label={`Animated 3D character ${characterId}`}
    />
  );
}
