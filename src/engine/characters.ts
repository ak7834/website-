import {
  CharacterEmotion,
  CharacterId,
  SceneActionStyle,
  SceneBeat,
  StagePropId,
} from '../types/studio';
import { getCharacterById } from './presets';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawSphere3D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lightCol: string,
  midCol: string,
  shadowCol: string,
  outlineCol = '#2A1F2D'
) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(
    cx - rx * 0.34,
    cy - ry * 0.36,
    rx * 0.08,
    cx,
    cy,
    Math.max(rx, ry) * 1.05
  );
  grad.addColorStop(0, lightCol);
  grad.addColorStop(0.55, midCol);
  grad.addColorStop(1, shadowCol);
  ctx.fillStyle = grad;
  ctx.fill();
  if (outlineCol !== 'rgba(0,0,0,0)') {
    ctx.lineWidth = Math.max(2, rx * 0.045);
    ctx.strokeStyle = outlineCol;
    ctx.stroke();
  }

  // Glossy top-left 3D catchlight
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.28, cy - ry * 0.32, rx * 0.22, ry * 0.12, -0.45, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fill();
  ctx.restore();
}

function drawStarShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  fill: string,
  stroke: string
) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function drawExpressiveFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  timeSec: number,
  audioLevel: number,
  emotion: CharacterEmotion,
  eyeColor = '#1E293B',
  cheekColor = 'rgba(244, 114, 182, 0.36)'
) {
  const blinkCycle = (timeSec * 0.85) % 3.6;
  const isBlinking = blinkCycle > 3.44;

  const eyeOffsetX = r * 0.32;
  const eyeY = cy - r * 0.06;
  const eyeR = r * 0.16;

  // Rosy 3D cheeks
  ctx.fillStyle = cheekColor;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.44, cy + r * 0.15, r * 0.17, r * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + r * 0.44, cy + r * 0.15, r * 0.17, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeOffsetX;
    if (isBlinking || emotion === 'laughing') {
      ctx.beginPath();
      ctx.arc(ex, eyeY + eyeR * 0.2, eyeR * 0.85, Math.PI * 1.15, Math.PI * 1.85);
      ctx.lineWidth = Math.max(2.5, r * 0.065);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1E1B24';
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeR, eyeR * 1.12, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = Math.max(1.8, r * 0.04);
      ctx.strokeStyle = '#1E1B24';
      ctx.stroke();

      const glanceX = Math.sin(timeSec * 1.4) * eyeR * 0.14;
      const pupilR = emotion === 'surprised' ? eyeR * 0.5 : eyeR * 0.64;
      ctx.beginPath();
      ctx.arc(ex + glanceX, eyeY + eyeR * 0.05, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = eyeColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex + glanceX - pupilR * 0.34, eyeY - pupilR * 0.32, pupilR * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + glanceX + pupilR * 0.28, eyeY + pupilR * 0.32, pupilR * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.lineWidth = Math.max(2.4, r * 0.06);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2A1F2D';
    const browY = eyeY - eyeR * 1.55;
    if (emotion === 'heroic') {
      ctx.moveTo(ex - side * eyeR * 0.85, browY - r * 0.05);
      ctx.lineTo(ex + side * eyeR * 0.85, browY + r * 0.06);
    } else if (emotion === 'curious') {
      const lift = side === 1 ? -r * 0.08 : r * 0.02;
      ctx.moveTo(ex - eyeR * 0.75, browY + lift);
      ctx.quadraticCurveTo(ex, browY - r * 0.12 + lift, ex + eyeR * 0.75, browY + lift);
    } else {
      const lift = emotion === 'excited' || emotion === 'surprised' ? -r * 0.07 : 0;
      ctx.moveTo(ex - eyeR * 0.75, browY + lift);
      ctx.quadraticCurveTo(ex, browY - r * 0.12 + lift, ex + eyeR * 0.75, browY + lift);
    }
    ctx.stroke();
  }

  const talkOpen = clamp(audioLevel * 1.35 + (Math.sin(timeSec * 14) * 0.5 + 0.5) * audioLevel * 0.4, 0, 1);
  const mouthY = cy + r * 0.26;
  const mouthW = r * (0.28 + talkOpen * 0.12);
  const mouthH = r * (0.09 + talkOpen * 0.26 + (emotion === 'surprised' ? 0.16 : 0));

  ctx.save();
  if (talkOpen > 0.16 || emotion === 'excited' || emotion === 'laughing' || emotion === 'surprised') {
    ctx.beginPath();
    if (emotion === 'surprised' && talkOpen < 0.25) {
      ctx.ellipse(cx, mouthY + r * 0.05, r * 0.13, r * 0.16, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(cx - mouthW, mouthY);
      ctx.quadraticCurveTo(cx, mouthY - r * 0.04, cx + mouthW, mouthY);
      ctx.quadraticCurveTo(cx, mouthY + mouthH * 2.0, cx - mouthW, mouthY);
      ctx.closePath();
    }
    ctx.fillStyle = '#7F1D1D';
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.strokeStyle = '#2A1F2D';
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + mouthH * 1.25, mouthW * 0.62, mouthH * 0.72, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FB7185';
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(cx, mouthY - r * 0.02, mouthW * 0.78, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.lineWidth = Math.max(2.5, r * 0.058);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2A1F2D';
    ctx.stroke();
  }
  ctx.restore();
}

function drawCharacterRig(
  ctx: CanvasRenderingContext2D,
  characterId: CharacterId,
  cx: number,
  cy: number,
  scale: number,
  timeSec: number,
  audioLevel: number,
  emotion: CharacterEmotion,
  action: SceneActionStyle = 'bounce'
) {
  ctx.save();

  // Action-specific playful cartoon motion choreography
  let actionOffsetY = 0;
  let actionOffsetX = 0;
  let extraTilt = 0;
  let bounce = Math.sin(timeSec * 5.2) * 0.04 + audioLevel * 0.07;

  if (action === 'hero-jump') {
    const hop = Math.abs(Math.sin(timeSec * 4.2));
    actionOffsetY = -hop * 22 * scale;
    bounce = hop * 0.08 + audioLevel * 0.06;
  } else if (action === 'dance') {
    actionOffsetX = Math.sin(timeSec * 5.4) * 12 * scale;
    actionOffsetY = -Math.abs(Math.sin(timeSec * 5.4)) * 10 * scale;
    extraTilt = Math.sin(timeSec * 5.4) * 0.12;
  } else if (action === 'float') {
    actionOffsetY = Math.sin(timeSec * 2.8) * 16 * scale - 10 * scale;
    extraTilt = Math.cos(timeSec * 2.1) * 0.07;
  } else if (action === 'peek') {
    actionOffsetY = (Math.sin(timeSec * 3.0) * 0.5 + 0.5) * 10 * scale;
    extraTilt = Math.sin(timeSec * 2.4) * 0.09;
  } else if (action === 'wave') {
    extraTilt = Math.sin(timeSec * 3.8) * 0.06;
  }

  ctx.translate(cx + actionOffsetX, cy + actionOffsetY);

  const stretchY = 1 + bounce;
  const squashX = 1 - bounce * 0.55;
  const tilt = Math.sin(timeSec * 2.6) * 0.045 + extraTilt;
  ctx.rotate(tilt);
  ctx.scale(scale * squashX, scale * stretchY);

  // Soft stage contact shadow
  ctx.beginPath();
  ctx.ellipse(0, 74 - actionOffsetY * 0.25 / Math.max(0.2, scale), 52, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.fill();

  const armWave = Math.sin(timeSec * (action === 'wave' ? 9 : 6.5)) * 0.36 + audioLevel * 0.28;

  switch (characterId) {
    case 'pip': {
      drawSphere3D(ctx, 0, 42, 34, 30, '#38BDF8', '#0284C7', '#0369A1');
      ctx.save();
      ctx.translate(-32, 32);
      ctx.rotate(-0.6 - armWave);
      drawSphere3D(ctx, -14, 0, 18, 9, '#FDE68A', '#FDBA74', '#EA580C');
      ctx.restore();
      ctx.save();
      ctx.translate(32, 32);
      ctx.rotate(0.6 + armWave);
      drawSphere3D(ctx, 14, 0, 18, 9, '#FDE68A', '#FDBA74', '#EA580C');
      ctx.restore();
      drawSphere3D(ctx, 0, 18, 28, 10, '#FDBA74', '#F97316', '#C2410C');
      drawSphere3D(ctx, 0, -14, 42, 40, '#FFF1DF', '#FCD5B5', '#E2A67C');
      drawExpressiveFace(ctx, 0, -12, 40, timeSec, audioLevel, emotion, '#1E293B');
      drawSphere3D(ctx, 0, -45, 44, 20, '#FEF3C7', '#F59E0B', '#B45309');
      ctx.beginPath();
      ctx.ellipse(0, -37, 54, 11, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FBBF24';
      ctx.fill();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#2A1F2D';
      ctx.stroke();
      drawSphere3D(ctx, 0, -48, 8, 8, '#FFFFFF', '#E0F2FE', '#0284C7');
      break;
    }

    case 'milo': {
      ctx.save();
      ctx.translate(28, 48);
      ctx.rotate(0.45 + Math.sin(timeSec * 8) * 0.25);
      drawSphere3D(ctx, 22, -6, 28, 14, '#FDBA74', '#EA580C', '#9A3412');
      drawSphere3D(ctx, 42, -8, 12, 10, '#FFFFFF', '#FFF7ED', '#FED7AA');
      ctx.restore();
      drawSphere3D(ctx, 0, 42, 32, 29, '#FDBA74', '#EA580C', '#9A3412');
      drawSphere3D(ctx, 0, 46, 18, 20, '#FFFFFF', '#FFF7ED', '#FED7AA');
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 26, -44);
        ctx.rotate(s * (0.28 + Math.sin(timeSec * 5 + s) * 0.08));
        ctx.beginPath();
        ctx.moveTo(-16, 16);
        ctx.lineTo(0, -24);
        ctx.lineTo(16, 16);
        ctx.closePath();
        ctx.fillStyle = '#EA580C';
        ctx.fill();
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = '#2A1F2D';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-8, 11);
        ctx.lineTo(0, -11);
        ctx.lineTo(8, 11);
        ctx.closePath();
        ctx.fillStyle = '#FED7AA';
        ctx.fill();
        ctx.restore();
      }
      drawSphere3D(ctx, 0, -12, 44, 38, '#FDBA74', '#EA580C', '#B45309');
      drawSphere3D(ctx, -20, 2, 22, 16, '#FFFFFF', '#FFF7ED', '#FED7AA', 'rgba(0,0,0,0)');
      drawSphere3D(ctx, 20, 2, 22, 16, '#FFFFFF', '#FFF7ED', '#FED7AA', 'rgba(0,0,0,0)');
      drawExpressiveFace(ctx, 0, -12, 38, timeSec, audioLevel, emotion, '#1E293B');
      drawSphere3D(ctx, 0, -5, 6.5, 5, '#475569', '#1E293B', '#020617');
      break;
    }

    case 'luna': {
      const wingFlap = Math.sin(timeSec * 14) * 0.22;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 24, 24);
        ctx.rotate(s * (0.35 + wingFlap));
        ctx.beginPath();
        ctx.ellipse(s * 22, -6, 26, 15, s * -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(216, 180, 254, 0.78)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#7E22CE';
        ctx.stroke();
        ctx.restore();
      }
      drawSphere3D(ctx, 0, 44, 34, 30, '#E9D5FF', '#A855F7', '#6B21A8');
      ctx.save();
      ctx.translate(34, 28);
      ctx.rotate(-0.4 + armWave);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, -26);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#FDE047';
      ctx.lineCap = 'round';
      ctx.stroke();
      drawStarShape(ctx, 26, -29, 13, 6, 5, '#FEF08A', '#CA8A04');
      ctx.restore();
      drawSphere3D(ctx, -34, -28, 16, 16, '#C084FC', '#9333EA', '#581C87');
      drawSphere3D(ctx, 34, -28, 16, 16, '#C084FC', '#9333EA', '#581C87');
      drawSphere3D(ctx, 0, -14, 40, 39, '#FFF1DF', '#FCD5B5', '#E2A67C');
      drawExpressiveFace(ctx, 0, -12, 39, timeSec, audioLevel, emotion, '#581C87');
      drawStarShape(ctx, 0, -54, 12, 5.5, 5, '#FDE047', '#B45309');
      break;
    }

    case 'barnaby': {
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(Math.sin(timeSec * 10) * 6, -70);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#475569';
      ctx.stroke();
      drawSphere3D(ctx, Math.sin(timeSec * 10) * 6, -75, 9, 9, '#FEF08A', '#F97316', '#C2410C');
      drawSphere3D(ctx, 0, 44, 35, 29, '#E0F2FE', '#38BDF8', '#0369A1');
      drawSphere3D(ctx, -11, 44, 6, 6, '#FEF08A', '#FACC15', '#CA8A04');
      drawSphere3D(ctx, 11, 44, 6, 6, '#BBF7D0', '#4ADE80', '#15803D');
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 34, 36);
        ctx.rotate(s * (0.4 + armWave));
        drawSphere3D(ctx, s * 14, 0, 16, 8, '#CBD5E1', '#94A3B8', '#475569');
        ctx.restore();
      }
      drawSphere3D(ctx, 0, -14, 44, 38, '#F0F9FF', '#7DD3FC', '#0284C7');
      ctx.beginPath();
      ctx.roundRect(-31, -34, 62, 40, 14);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#38BDF8';
      ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(-13, -18, 6.5, 0, Math.PI * 2);
      ctx.arc(13, -18, 6.5, 0, Math.PI * 2);
      ctx.fill();
      const barH = 4 + audioLevel * 12;
      for (let i = -2; i <= 2; i++) {
        const h = barH * (1 - Math.abs(i) * 0.16);
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(i * 7 - 2.5, -5 - h * 0.3, 5, Math.max(3, h));
      }
      break;
    }

    case 'coco': {
      drawSphere3D(ctx, 0, 44, 35, 30, '#334155', '#1E293B', '#020617');
      drawSphere3D(ctx, 0, 46, 21, 21, '#FFFFFF', '#F8FAFC', '#CBD5E1');
      drawSphere3D(ctx, -31, -44, 15, 15, '#475569', '#1E293B', '#020617');
      drawSphere3D(ctx, 31, -44, 15, 15, '#475569', '#1E293B', '#020617');
      drawSphere3D(ctx, 0, -14, 43, 39, '#FFFFFF', '#F8FAFC', '#CBD5E1');
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(-15, -16, 13, 10, -0.25, 0, Math.PI * 2);
      ctx.ellipse(15, -16, 13, 10, 0.25, 0, Math.PI * 2);
      ctx.fill();
      drawExpressiveFace(ctx, 0, -12, 39, timeSec, audioLevel, emotion, '#0F172A');
      drawSphere3D(ctx, 8, -48, 30, 12, '#FDA4AF', '#E11D48', '#881337');
      ctx.save();
      ctx.translate(36, 36);
      ctx.rotate(-0.18 + Math.sin(timeSec * 6) * 0.12);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-12, -10, 26, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-12, -14, 26, 6);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -14, 26, 24);
      ctx.restore();
      break;
    }

    case 'sunny': {
      ctx.beginPath();
      ctx.moveTo(-26, 18);
      ctx.quadraticCurveTo(-52, 54, -40, 74);
      ctx.lineTo(40, 74);
      ctx.quadraticCurveTo(52, 54, 26, 18);
      ctx.closePath();
      ctx.fillStyle = '#DC2626';
      ctx.fill();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#2A1F2D';
      ctx.stroke();
      drawSphere3D(ctx, 0, 44, 31, 28, '#FEF08A', '#EAB308', '#A16207');
      drawSphere3D(ctx, 0, -14, 41, 39, '#FFF1DF', '#FCD5B5', '#E2A67C');
      drawExpressiveFace(ctx, 0, -12, 39, timeSec, audioLevel, emotion, '#1E293B');
      ctx.beginPath();
      ctx.moveTo(-28, -44);
      ctx.lineTo(-32, -68);
      ctx.lineTo(-12, -55);
      ctx.lineTo(0, -74);
      ctx.lineTo(12, -55);
      ctx.lineTo(32, -68);
      ctx.lineTo(28, -44);
      ctx.closePath();
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#2A1F2D';
      ctx.stroke();
      drawSphere3D(ctx, 0, -54, 5, 5, '#FDA4AF', '#E11D48', '#881337');
      break;
    }

    case 'bubu': {
      const flap = Math.sin(timeSec * 10) * 0.25;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 28, 30);
        ctx.rotate(s * (0.2 + flap));
        ctx.beginPath();
        ctx.ellipse(s * 20, -4, 24, 13, s * -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#FDE047';
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#15803D';
        ctx.stroke();
        ctx.restore();
      }
      drawSphere3D(ctx, 0, 44, 36, 31, '#86EFAC', '#22C55E', '#15803D');
      drawSphere3D(ctx, 0, 48, 22, 22, '#FEF9C3', '#FDE047', '#CA8A04');
      drawSphere3D(ctx, -20, -50, 9, 14, '#FEF08A', '#F59E0B', '#B45309');
      drawSphere3D(ctx, 20, -50, 9, 14, '#FEF08A', '#F59E0B', '#B45309');
      drawSphere3D(ctx, 0, -14, 44, 39, '#86EFAC', '#22C55E', '#15803D');
      drawExpressiveFace(ctx, 0, -12, 39, timeSec, audioLevel, emotion, '#14532D', 'rgba(251, 146, 60, 0.42)');
      break;
    }

    case 'toto': {
      drawSphere3D(ctx, 0, 38, 38, 36, '#DDD6FE', '#8B5CF6', '#5B21B6');
      drawSphere3D(ctx, 0, 46, 24, 24, '#FFFFFF', '#F5F3FF', '#DDD6FE');
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 34, 34);
        ctx.rotate(s * (0.25 + armWave * 0.7));
        drawSphere3D(ctx, s * 10, 6, 15, 22, '#C4B5FD', '#7C3AED', '#4C1D95');
        ctx.restore();
      }
      drawSphere3D(ctx, 0, -14, 43, 38, '#EDE9FE', '#8B5CF6', '#5B21B6');
      drawExpressiveFace(ctx, 0, -12, 38, timeSec, audioLevel, emotion, '#1E1B4B');
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(-14, -15, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(14, -15, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1, -15);
      ctx.lineTo(1, -15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, -8);
      ctx.lineTo(7, -8);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2A1F2D';
      ctx.stroke();
      break;
    }

    // --- 8 NEW 3D KIDS-DRAMA CHARACTERS (9..16) ---
    case 'kiko': {
      // Curling playful monkey tail
      ctx.save();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(26, 48);
      ctx.bezierCurveTo(60, 42, 66, 4 + Math.sin(timeSec * 7) * 10, 46, -6);
      ctx.stroke();
      ctx.restore();

      // Monkey torso + belly
      drawSphere3D(ctx, 0, 42, 33, 29, '#D97706', '#B45309', '#78350F');
      drawSphere3D(ctx, 0, 45, 20, 20, '#FEF3C7', '#FDE68A', '#F59E0B', 'rgba(0,0,0,0)');
      // Red bandana
      drawSphere3D(ctx, 0, 18, 28, 9, '#FCA5A5', '#EF4444', '#991B1B');
      // Big round monkey ears
      drawSphere3D(ctx, -44, -16, 16, 16, '#D97706', '#B45309', '#78350F');
      drawSphere3D(ctx, -44, -16, 9, 9, '#FEF3C7', '#FCD34D', '#D97706', 'rgba(0,0,0,0)');
      drawSphere3D(ctx, 44, -16, 16, 16, '#D97706', '#B45309', '#78350F');
      drawSphere3D(ctx, 44, -16, 9, 9, '#FEF3C7', '#FCD34D', '#D97706', 'rgba(0,0,0,0)');
      // Head + light face mask
      drawSphere3D(ctx, 0, -14, 41, 38, '#D97706', '#B45309', '#78350F');
      drawSphere3D(ctx, 0, -6, 33, 27, '#FFFBEB', '#FEF3C7', '#FDE68A', 'rgba(0,0,0,0)');
      drawExpressiveFace(ctx, 0, -10, 36, timeSec, audioLevel, emotion, '#1E293B');
      // Cheeky hair tuft
      drawSphere3D(ctx, 0, -52, 12, 9, '#B45309', '#92400E', '#451A03');
      break;
    }

    case 'bella': {
      // Tall flopping pastel bunny ears
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 17, -45);
        ctx.rotate(s * (0.14 + Math.sin(timeSec * 5 + s) * 0.12));
        drawSphere3D(ctx, 0, -24, 13, 30, '#FFFFFF', '#FFF1F2', '#FBCFE8');
        drawSphere3D(ctx, 0, -22, 6, 20, '#FBCFE8', '#F472B6', '#DB2777', 'rgba(0,0,0,0)');
        ctx.restore();
      }
      // Bunny body + dress
      drawSphere3D(ctx, 0, 44, 34, 30, '#FCE7F3', '#F472B6', '#BE185D');
      // Bunny head
      drawSphere3D(ctx, 0, -12, 42, 38, '#FFFFFF', '#FFF5F7', '#FBCFE8');
      drawExpressiveFace(ctx, 0, -11, 38, timeSec, audioLevel, emotion, '#831843');
      // Cute pink bunny nose
      drawSphere3D(ctx, 0, -5, 6, 4.5, '#FBCFE8', '#EC4899', '#9D174D');
      // Pink hair bow
      drawSphere3D(ctx, -20, -45, 11, 8, '#F9A8D4', '#EC4899', '#9D174D');
      drawSphere3D(ctx, -5, -45, 11, 8, '#F9A8D4', '#EC4899', '#9D174D');
      break;
    }

    case 'zuzu': {
      // Spacesuit body + star chest badge
      drawSphere3D(ctx, 0, 44, 35, 30, '#FFFFFF', '#E2E8F0', '#94A3B8');
      drawSphere3D(ctx, 0, 44, 16, 12, '#60A5FA', '#2563EB', '#1E40AF');
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 34, 34);
        ctx.rotate(s * (0.45 + armWave));
        drawSphere3D(ctx, s * 14, 0, 16, 9, '#FFFFFF', '#E2E8F0', '#64748B');
        ctx.restore();
      }
      // Kid head inside space helmet
      drawSphere3D(ctx, 0, -14, 36, 35, '#FFF1DF', '#FCD5B5', '#E2A67C');
      drawExpressiveFace(ctx, 0, -12, 35, timeSec, audioLevel, emotion, '#1E3A8A');
      // Glossy transparent bubble helmet
      ctx.beginPath();
      ctx.arc(0, -14, 48, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.24)';
      ctx.fill();
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#38BDF8';
      ctx.stroke();
      // Curved helmet gloss arc
      ctx.beginPath();
      ctx.arc(-14, -30, 22, Math.PI * 1.05, Math.PI * 1.55);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.stroke();
      // Orbiting mini star
      const ox = Math.cos(timeSec * 3.5) * 56;
      const oy = -26 + Math.sin(timeSec * 3.5) * 14;
      drawStarShape(ctx, ox, oy, 9, 4, 5, '#FEF08A', '#D97706');
      break;
    }

    case 'raju': {
      // Sunny lion cub body
      drawSphere3D(ctx, 0, 44, 34, 29, '#FDE047', '#F59E0B', '#B45309');
      drawSphere3D(ctx, 0, 47, 19, 19, '#FEF9C3', '#FEF08A', '#FACC15', 'rgba(0,0,0,0)');
      // Fluffy petal mane ring around head
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.sin(timeSec * 3) * 0.05;
        const mx = Math.cos(ang) * 41;
        const my = -14 + Math.sin(ang) * 39;
        drawSphere3D(ctx, mx, my, 16, 16, '#FDBA74', '#EA580C', '#9A3412');
      }
      // Lion ears
      drawSphere3D(ctx, -30, -45, 13, 13, '#FDE047', '#F59E0B', '#B45309');
      drawSphere3D(ctx, 30, -45, 13, 13, '#FDE047', '#F59E0B', '#B45309');
      // Lion face
      drawSphere3D(ctx, 0, -14, 38, 36, '#FEF9C3', '#FDE047', '#EAB308');
      drawExpressiveFace(ctx, 0, -12, 36, timeSec, audioLevel, emotion, '#451A03');
      drawSphere3D(ctx, 0, -4, 7, 5, '#B45309', '#78350F', '#451A03');
      break;
    }

    case 'mimi': {
      // Unicorn body
      drawSphere3D(ctx, 0, 44, 34, 29, '#FFFFFF', '#FAE8FF', '#E879F9');
      // Rainbow mane puffs
      drawSphere3D(ctx, -34, -28, 15, 15, '#FDA4AF', '#FB7185', '#E11D48');
      drawSphere3D(ctx, -38, -8, 14, 14, '#FDE047', '#FACC15', '#CA8A04');
      drawSphere3D(ctx, 34, -22, 15, 15, '#93C5FD', '#38BDF8', '#0284C7');
      // Unicorn ears
      drawSphere3D(ctx, -24, -48, 10, 18, '#FFFFFF', '#FAE8FF', '#D946EF');
      drawSphere3D(ctx, 24, -48, 10, 18, '#FFFFFF', '#FAE8FF', '#D946EF');
      // Golden spiral horn
      ctx.beginPath();
      ctx.moveTo(-10, -46);
      ctx.lineTo(0, -82);
      ctx.lineTo(10, -46);
      ctx.closePath();
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#A16207';
      ctx.stroke();
      // Unicorn head
      drawSphere3D(ctx, 0, -13, 41, 38, '#FFFFFF', '#FDF4FF', '#F5D0FE');
      drawExpressiveFace(ctx, 0, -11, 38, timeSec, audioLevel, emotion, '#701A75');
      break;
    }

    case 'pogo': {
      // Chubby green frog body
      drawSphere3D(ctx, 0, 42, 37, 30, '#6EE7B7', '#10B981', '#047857');
      drawSphere3D(ctx, 0, 47, 23, 20, '#ECFDF5', '#A7F3D0', '#34D399', 'rgba(0,0,0,0)');
      // Frog top eye bumps
      drawSphere3D(ctx, -22, -45, 18, 18, '#6EE7B7', '#10B981', '#047857');
      drawSphere3D(ctx, 22, -45, 18, 18, '#6EE7B7', '#10B981', '#047857');
      // Wide cheerful frog head
      drawSphere3D(ctx, 0, -12, 46, 35, '#6EE7B7', '#10B981', '#047857');
      drawExpressiveFace(ctx, 0, -18, 39, timeSec, audioLevel, emotion, '#064E3B');
      // Mini golden frog prince crown
      ctx.beginPath();
      ctx.moveTo(-14, -49);
      ctx.lineTo(-16, -64);
      ctx.lineTo(-5, -56);
      ctx.lineTo(0, -68);
      ctx.lineTo(5, -56);
      ctx.lineTo(16, -64);
      ctx.lineTo(14, -49);
      ctx.closePath();
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2A1F2D';
      ctx.stroke();
      break;
    }

    case 'nini': {
      // Chef coat body
      drawSphere3D(ctx, 0, 44, 34, 29, '#FFFFFF', '#F8FAFC', '#CBD5E1');
      drawSphere3D(ctx, 0, 20, 26, 9, '#FDA4AF', '#E11D48', '#9F1239');
      // Ginger kitty ears
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 14, -40);
        ctx.lineTo(s * 34, -60);
        ctx.lineTo(s * 38, -28);
        ctx.closePath();
        ctx.fillStyle = '#FB923C';
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = '#2A1F2D';
        ctx.stroke();
      }
      // Kitty head
      drawSphere3D(ctx, 0, -13, 41, 37, '#FED7AA', '#FB923C', '#C2410C');
      drawExpressiveFace(ctx, 0, -11, 37, timeSec, audioLevel, emotion, '#1E293B');
      // Whiskers
      ctx.strokeStyle = '#2A1F2D';
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 26, -6);
        ctx.lineTo(s * 48, -10);
        ctx.moveTo(s * 26, 2);
        ctx.lineTo(s * 48, 5);
        ctx.stroke();
      }
      // Puffy white chef toque hat
      drawSphere3D(ctx, -14, -56, 15, 14, '#FFFFFF', '#F8FAFC', '#E2E8F0');
      drawSphere3D(ctx, 14, -56, 15, 14, '#FFFFFF', '#F8FAFC', '#E2E8F0');
      drawSphere3D(ctx, 0, -61, 18, 15, '#FFFFFF', '#F8FAFC', '#E2E8F0');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-24, -51, 48, 12);
      ctx.strokeRect(-24, -51, 48, 12);
      break;
    }

    case 'golu': {
      // Big flapping baby elephant ears
      const earFlap = Math.sin(timeSec * 6) * 0.16;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 36, -14);
        ctx.rotate(s * earFlap);
        drawSphere3D(ctx, s * 14, 2, 24, 30, '#BAE6FD', '#38BDF8', '#0284C7');
        drawSphere3D(ctx, s * 13, 4, 14, 19, '#FCE7F3', '#F9A8D4', '#EC4899', 'rgba(0,0,0,0)');
        ctx.restore();
      }
      // Elephant body
      drawSphere3D(ctx, 0, 44, 38, 31, '#BAE6FD', '#38BDF8', '#0284C7');
      drawSphere3D(ctx, 0, 20, 30, 10, '#FEF08A', '#F59E0B', '#B45309');
      // Elephant head
      drawSphere3D(ctx, 0, -14, 42, 38, '#E0F2FE', '#38BDF8', '#0284C7');
      drawExpressiveFace(ctx, 0, -18, 37, timeSec, audioLevel, emotion, '#0C4A6E');
      // Festive forehead tika / star gem
      drawSphere3D(ctx, 0, -40, 5.5, 5.5, '#FEF08A', '#F97316', '#DC2626');
      // Curling animated happy trunk
      ctx.save();
      const trunkLift = Math.sin(timeSec * 5) * 6 + audioLevel * 12;
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(8, 18, 22, 12 - trunkLift);
      ctx.stroke();
      ctx.strokeStyle = '#7DD3FC';
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.restore();
      break;
    }
  }

  ctx.restore();
}

function drawStageProps(
  ctx: CanvasRenderingContext2D,
  prop: StagePropId,
  w: number,
  h: number,
  timeSec: number,
  enterAlpha: number
) {
  ctx.save();
  ctx.globalAlpha = clamp(enterAlpha, 0, 1);

  switch (prop) {
    case 'curtains': {
      const sway = Math.sin(timeSec * 2.2) * 8;
      const cw = w * 0.1;
      for (const side of [-1, 1]) {
        ctx.save();
        if (side === 1) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        const grad = ctx.createLinearGradient(0, 0, cw, 0);
        grad.addColorStop(0, '#991B1B');
        grad.addColorStop(0.6, '#DC2626');
        grad.addColorStop(1, '#EF4444');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cw + 18, 0);
        ctx.quadraticCurveTo(cw * 0.65 + sway, h * 0.45, cw * 0.25, h * 0.78);
        ctx.lineTo(0, h * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'stars':
    case 'sparkles': {
      const count = prop === 'sparkles' ? 9 : 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + timeSec * 0.4;
        const px = w * (0.12 + ((i * 0.17) % 0.78));
        const py = h * (0.12 + ((i * 0.13) % 0.28)) + Math.sin(timeSec * 3.1 + i) * 10;
        const r = (prop === 'sparkles' ? 11 : 15) * (0.75 + 0.25 * Math.sin(timeSec * 5 + i));
        const fill = i % 2 === 0 ? '#FDE047' : '#FDBA74';
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle * 0.4);
        drawStarShape(ctx, 0, 0, r, r * 0.45, 5, fill, '#B45309');
        ctx.restore();
      }
      break;
    }

    case 'rainbow': {
      const colors = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#A855F7'];
      const rBase = Math.min(w, h) * 0.42;
      ctx.save();
      ctx.globalAlpha *= 0.42;
      colors.forEach((col, idx) => {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.28, rBase - idx * 10, Math.PI * 1.12, Math.PI * 1.88);
        ctx.lineWidth = 9;
        ctx.strokeStyle = col;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
      ctx.restore();
      break;
    }

    case 'bubbles': {
      for (let i = 0; i < 8; i++) {
        const bx = w * (0.08 + ((i * 0.13) % 0.84)) + Math.sin(timeSec * 2 + i) * 14;
        const by = h - (((timeSec * 55 + i * 95) % (h * 0.85)) + h * 0.08);
        const br = 12 + (i % 3) * 7;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224, 242, 254, 0.32)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();
      }
      break;
    }

    case 'notes': {
      const symbols = ['♪', '♫', '♩'];
      ctx.font = `700 ${Math.round(h * 0.055)}px "Bricolage Grotesque", sans-serif`;
      for (let i = 0; i < 6; i++) {
        const nx = w * (0.14 + i * 0.14) + Math.sin(timeSec * 2.5 + i) * 12;
        const ny = h * 0.18 + Math.cos(timeSec * 3 + i) * 16;
        ctx.fillStyle = i % 2 === 0 ? '#38BDF8' : '#F97316';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeText(symbols[i % symbols.length], nx, ny);
        ctx.fillText(symbols[i % symbols.length], nx, ny);
      }
      break;
    }

    case 'butterflies': {
      const palette = ['#F472B6', '#38BDF8', '#FACC15', '#A78BFA'];
      for (let i = 0; i < 6; i++) {
        const bx = w * (0.12 + i * 0.15) + Math.sin(timeSec * 2.4 + i * 1.3) * 28;
        const by = h * (0.15 + (i % 3) * 0.08) + Math.cos(timeSec * 3.2 + i) * 18;
        const flap = 0.45 + 0.55 * Math.abs(Math.sin(timeSec * 11 + i));
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = palette[i % palette.length];
        ctx.beginPath();
        ctx.ellipse(-9 * flap, -3, 11 * flap, 8, -0.3, 0, Math.PI * 2);
        ctx.ellipse(9 * flap, -3, 11 * flap, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'balloons': {
      const colors = ['#EF4444', '#F59E0B', '#38BDF8', '#EC4899', '#22C55E'];
      for (let i = 0; i < 6; i++) {
        const bx = w * (0.08 + i * 0.165) + Math.sin(timeSec * 1.8 + i) * 10;
        const by = h * 0.22 + Math.cos(timeSec * 2.2 + i) * 14;
        ctx.beginPath();
        ctx.moveTo(bx, by + 20);
        ctx.quadraticCurveTo(bx + 6, by + 40, bx - 4, by + 56);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        drawSphere3D(ctx, bx, by, 16, 20, '#FFFFFF', colors[i % colors.length], '#1E293B');
      }
      break;
    }

    case 'confetti':
    case 'crown': {
      const palette = ['#FACC15', '#FB7185', '#38BDF8', '#4ADE80', '#C084FC'];
      for (let i = 0; i < 14; i++) {
        const cx = w * (0.05 + ((i * 0.071) % 0.9));
        const cy = ((timeSec * 70 + i * 48) % (h * 0.55)) + h * 0.04;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(timeSec * 3 + i);
        ctx.fillStyle = palette[i % palette.length];
        ctx.beginPath();
        ctx.roundRect(-6, -3.5, 12, 7, 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'sunbeams': {
      ctx.save();
      ctx.globalAlpha *= 0.24;
      ctx.translate(w * 0.88, h * 0.1);
      ctx.rotate(timeSec * 0.2);
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-24, h * 0.65);
        ctx.lineTo(24, h * 0.65);
        ctx.closePath();
        ctx.fillStyle = '#FEF08A';
        ctx.fill();
      }
      ctx.restore();
      break;
    }
  }

  ctx.restore();
}

function drawSceneBanner(
  ctx: CanvasRenderingContext2D,
  sceneIndex: number,
  sceneTitle: string,
  canvasW: number,
  elapsedInBeat: number,
  remainingInBeat: number
) {
  if (!sceneTitle) return;
  const fadeIn = clamp(elapsedInBeat / 0.35, 0, 1);
  const fadeOut = remainingInBeat < 0.3 ? clamp(remainingInBeat / 0.3, 0, 1) : 1;
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0.05) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  const label = `Scene ${String(sceneIndex + 1).padStart(2, '0')} · ${sceneTitle}`;
  ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
  const textW = ctx.measureText(label).width;
  const boxW = textW + 28;
  const boxH = 32;
  const bx = (canvasW - boxW) * 0.5;
  const by = 16;

  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 10);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.76)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 14, by + boxH * 0.5);
  ctx.restore();
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  caption: string,
  characterName: string,
  accentHex: string,
  anchorX: number,
  anchorY: number,
  canvasW: number,
  canvasH: number,
  enterScale: number
) {
  if (!caption.trim()) return;

  ctx.save();
  const fontSize = clamp(Math.round(canvasH * 0.032), 14, 23);
  const nameFontSize = Math.max(11, Math.round(fontSize * 0.65));
  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;

  const maxBubbleW = Math.min(canvasW * 0.45, 430);
  const words = caption.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxBubbleW - 36 && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const textWidth = Math.max(
    ...lines.map((l) => ctx.measureText(l).width),
    ctx.measureText(characterName).width + 32
  );
  const padX = 18;
  const padY = 13;
  const lineH = fontSize * 1.3;
  const boxW = Math.min(maxBubbleW, textWidth + padX * 2);
  const boxH = nameFontSize + 8 + lines.length * lineH + padY * 2;

  const isRightSide = anchorX > canvasW * 0.5;
  let bx = isRightSide ? anchorX - boxW - 22 : anchorX + 22;
  bx = clamp(bx, 18, canvasW - boxW - 18);
  const by = clamp(anchorY - boxH - 12, 54, canvasH - boxH - 18);

  const cx = bx + boxW * 0.5;
  const cy = by + boxH * 0.5;
  ctx.translate(cx, cy);
  ctx.scale(enterScale, enterScale);
  ctx.translate(-cx, -cy);

  ctx.shadowColor = 'rgba(15, 23, 42, 0.24)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1E293B';
  ctx.stroke();

  const tailX = isRightSide ? bx + boxW - 28 : bx + 28;
  ctx.beginPath();
  ctx.moveTo(tailX - 10, by + boxH - 1);
  ctx.lineTo(tailX + (isRightSide ? 14 : -14), by + boxH + 14);
  ctx.lineTo(tailX + 10, by + boxH - 1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fill();
  ctx.stroke();

  ctx.font = `700 ${nameFontSize}px "Bricolage Grotesque", sans-serif`;
  ctx.fillStyle = accentHex;
  ctx.textBaseline = 'top';
  ctx.fillText(characterName, bx + padX, by + padY - 2);

  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#0F172A';
  lines.forEach((line, idx) => {
    ctx.fillText(line, bx + padX, by + padY + nameFontSize + 6 + idx * lineH);
  });

  ctx.restore();
}

export interface DramaOverlayOptions {
  beat: SceneBeat;
  sceneIndex?: number;
  timeSec: number;
  audioLevel: number;
  showCaptions: boolean;
  showProps: boolean;
  showSceneBanner?: boolean;
  isStaticPhoto?: boolean;
}

/**
 * Composites the active Kids Play Drama animated lead character, optional buddy cameo,
 * stage props, scene banner, and speech caption onto the 3D-cartoonized canvas frame.
 */
export function drawDramaStageOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  options: DramaOverlayOptions
) {
  const {
    beat,
    sceneIndex = 0,
    timeSec,
    audioLevel,
    showCaptions,
    showProps,
    showSceneBanner = false,
    isStaticPhoto = false,
  } = options;

  const elapsedInBeat = isStaticPhoto ? 2.0 : Math.max(0, timeSec - beat.startSec);
  const remainingInBeat = isStaticPhoto ? 5.0 : Math.max(0, beat.endSec - timeSec);

  const enterT = clamp(elapsedInBeat / 0.55, 0, 1);
  const exitT = remainingInBeat < 0.35 ? clamp(remainingInBeat / 0.35, 0, 1) : 1;
  const popScale = easeOutBack(enterT) * exitT;

  if (showProps) {
    drawStageProps(ctx, beat.prop, w, h, timeSec, Math.min(enterT * 1.4, exitT));
  }

  if (showSceneBanner && !isStaticPhoto) {
    drawSceneBanner(ctx, sceneIndex, beat.sceneTitle, w, elapsedInBeat, remainingInBeat);
  }

  const baseScale = clamp(Math.min(w, h) / 480, 0.65, 1.5);
  const charScale = baseScale * popScale;
  const marginX = w * 0.145;
  const isRight = beat.position === 'right' || beat.position === 'bottom-right';
  const isLower = beat.position === 'bottom-left' || beat.position === 'bottom-right';

  const slideOffset = isStaticPhoto ? 0 : (1 - easeOutBack(enterT)) * (isRight ? 120 : -120);
  const charX = (isRight ? w - marginX : marginX) + slideOffset;
  const charY = isLower ? h * 0.77 : h * 0.7;

  // Draw optional Buddy Co-Star on the opposite corner for richer multi-character kids drama!
  if (beat.buddyCharacterId && beat.buddyCharacterId !== beat.characterId) {
    const buddyEnter = isStaticPhoto ? 1 : clamp((elapsedInBeat - 0.35) / 0.5, 0, 1);
    const buddyPop = easeOutBack(buddyEnter) * exitT;
    if (buddyPop > 0.05) {
      const buddyX = isRight ? w * 0.13 : w - w * 0.13;
      const buddyY = h * 0.79;
      drawCharacterRig(
        ctx,
        beat.buddyCharacterId,
        buddyX,
        buddyY,
        baseScale * 0.78 * buddyPop,
        timeSec + 0.7,
        audioLevel * 0.55,
        'happy',
        'wave'
      );
    }
  }

  // Draw Lead Character
  drawCharacterRig(
    ctx,
    beat.characterId,
    charX,
    charY,
    charScale,
    timeSec,
    audioLevel,
    beat.emotion,
    beat.action || 'bounce'
  );

  if (showCaptions && beat.caption) {
    const profile = getCharacterById(beat.characterId);
    const bubbleEnter = isStaticPhoto ? 1 : clamp((elapsedInBeat - 0.15) / 0.35, 0, 1);
    const bubbleScale = easeOutBack(bubbleEnter) * exitT;
    if (bubbleScale > 0.05) {
      drawSpeechBubble(
        ctx,
        beat.caption,
        `${profile.name} · ${profile.role}`,
        profile.accentHex,
        charX,
        charY - 56 * charScale,
        w,
        h,
        bubbleScale
      );
    }
  }
}

export function drawCharacterPortrait(
  ctx: CanvasRenderingContext2D,
  characterId: CharacterId,
  width: number,
  height: number,
  timeSec: number,
  audioLevel = 0.18,
  emotion: CharacterEmotion = 'happy'
) {
  const profile = getCharacterById(characterId);
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.36,
    width * 0.08,
    width * 0.5,
    height * 0.5,
    width * 0.75
  );
  bg.addColorStop(0, '#FFFFFF');
  bg.addColorStop(1, profile.secondaryHex);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width, height) / 185;
  drawCharacterRig(
    ctx,
    characterId,
    width * 0.5,
    height * 0.56,
    scale,
    timeSec,
    audioLevel,
    emotion,
    profile.defaultAction
  );
}
