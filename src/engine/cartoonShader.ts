import { CartoonShaderParams } from '../types/studio';

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Edge-preserving bilateral painterly smoothing pass (sculpted 3D clay/Pixar surface look)
const BILATERAL_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_texelSize;
uniform float u_smoothness;
uniform float u_radiusScale;
uniform float u_flipY;

void main() {
  vec2 uv = u_flipY > 0.5 ? vec2(v_uv.x, 1.0 - v_uv.y) : v_uv;
  vec3 center = texture(u_tex, uv).rgb;

  if (u_smoothness <= 0.02) {
    outColor = vec4(center, 1.0);
    return;
  }

  float sigmaColor = mix(0.06, 0.24, u_smoothness);
  float invTwoSigmaC2 = 1.0 / (2.0 * sigmaColor * sigmaColor);
  float stepMul = mix(1.0, 2.35, u_smoothness) * u_radiusScale;

  vec3 accum = center;
  float weightSum = 1.0;

  // 12-tap ring + diagonal bilateral kernel
  vec2 offsets[12] = vec2[12](
    vec2( 1.0,  0.0), vec2(-1.0,  0.0), vec2( 0.0,  1.0), vec2( 0.0, -1.0),
    vec2( 1.0,  1.0), vec2(-1.0,  1.0), vec2( 1.0, -1.0), vec2(-1.0, -1.0),
    vec2( 2.0,  0.0), vec2(-2.0,  0.0), vec2( 0.0,  2.0), vec2( 0.0, -2.0)
  );
  float spatialWeights[12] = float[12](
    0.88, 0.88, 0.88, 0.88,
    0.72, 0.72, 0.72, 0.72,
    0.48, 0.48, 0.48, 0.48
  );

  for (int i = 0; i < 12; i++) {
    vec2 sampleUv = clamp(uv + offsets[i] * u_texelSize * stepMul, vec2(0.001), vec2(0.999));
    vec3 s = texture(u_tex, sampleUv).rgb;
    vec3 diff = s - center;
    float colorDist2 = dot(diff, diff);
    float w = spatialWeights[i] * exp(-colorDist2 * invTwoSigmaC2);
    accum += s * w;
    weightSum += w;
  }

  outColor = vec4(accum / weightSum, 1.0);
}
`;

// Final 3D Cartoon shading pass: soft sculpted toon shading, 3D rim light, subsurface warmth & ink outlines
const CARTOON_FINAL_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_texelSize;
uniform float u_outlineStrength;
uniform float u_saturation;
uniform float u_rimGlow;
uniform float u_toonBands;
uniform float u_warmth;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 adjustSaturation(vec3 color, float sat) {
  float l = luma(color);
  return mix(vec3(l), color, sat);
}

void main() {
  vec2 uv = v_uv;
  vec3 c = texture(u_tex, uv).rgb;

  // Sample 3x3 neighborhood for smooth Sobel edges & pseudo-3D normal estimation
  vec3 tl = texture(u_tex, clamp(uv + vec2(-1.0,  1.0) * u_texelSize, 0.0, 1.0)).rgb;
  vec3 tc = texture(u_tex, clamp(uv + vec2( 0.0,  1.0) * u_texelSize, 0.0, 1.0)).rgb;
  vec3 tr = texture(u_tex, clamp(uv + vec2( 1.0,  1.0) * u_texelSize, 0.0, 1.0)).rgb;
  vec3 ml = texture(u_tex, clamp(uv + vec2(-1.0,  0.0) * u_texelSize, 0.0, 1.0)).rgb;
  vec3 mr = texture(u_tex, clamp(uv + vec2( 1.0,  0.0) * u_texelSize, 0.0, 1.0)).rgb;
  vec3 bl = texture(u_tex, clamp(uv + vec2(-1.0, -1.0) * u_texelSize, 0.0, 1.0)).rgb;
  vec3 bc = texture(u_tex, clamp(uv + vec2( 0.0, -1.0) * u_texelSize, 0.0, 1.0)).rgb;
  vec3 br = texture(u_tex, clamp(uv + vec2( 1.0, -1.0) * u_texelSize, 0.0, 1.0)).rgb;

  float gx = -luma(tl) - 2.0 * luma(ml) - luma(bl) + luma(tr) + 2.0 * luma(mr) + luma(br);
  float gy = -luma(tl) - 2.0 * luma(tc) - luma(tr) + luma(bl) + 2.0 * luma(bc) + luma(br);
  float edgeMag = sqrt(gx * gx + gy * gy);

  // Soft sculpted 3D toon luminance ramp (smooth-knee blending prevents ugly posterization)
  float lum = max(luma(c), 0.0001);
  float bands = max(4.0, u_toonBands);
  float stepped = floor(lum * bands + 0.5) / bands;
  float softLum = mix(lum, stepped, 0.42);
  // Lift dark shadows slightly for cheerful Pixar/kids-animation clarity
  softLum = pow(clamp(softLum, 0.0, 1.0), 0.92) * 0.96 + 0.04;

  vec3 toonColor = c * (softLum / lum);

  // Synthesize subtle 3D key light + specular rim highlight from surface gradients
  vec3 pseudoNormal = normalize(vec3(-gx * 2.4, -gy * 2.4, 0.65));
  vec3 keyLightDir = normalize(vec3(-0.45, 0.65, 0.62));
  float ndotl = clamp(dot(pseudoNormal, keyLightDir), 0.0, 1.0);
  float rimFactor = pow(clamp(1.0 - pseudoNormal.z, 0.0, 1.0), 1.65);

  // Warm subsurface scatter on midtones & skin tones
  vec3 subsurface = vec3(1.04 + u_warmth * 0.16, 1.0 + u_warmth * 0.06, 0.95 - u_warmth * 0.08);
  toonColor *= subsurface;

  // Apply 3D studio rim highlight + gentle specular sheen
  vec3 rimTint = vec3(1.0, 0.96, 0.88);
  toonColor += rimTint * rimFactor * u_rimGlow * 0.28;
  toonColor += vec3(1.0, 0.98, 0.94) * pow(ndotl, 6.0) * u_rimGlow * 0.12;

  // Playful sky-tinted soft shadow bounce
  float shadowMask = smoothstep(0.45, 0.05, lum);
  toonColor = mix(toonColor, toonColor + vec3(0.03, 0.05, 0.09), shadowMask * 0.35);

  // Vibrancy boost
  toonColor = adjustSaturation(toonColor, u_saturation);

  // Warm storybook ink contour (rich deep espresso-indigo instead of muddy pure black)
  float edgeMask = smoothstep(0.16, 0.42, edgeMag) * u_outlineStrength;
  vec3 inkColor = vec3(0.14, 0.11, 0.18);
  vec3 finalCol = mix(toonColor, inkColor, clamp(edgeMask, 0.0, 0.85));

  // Subtle warm studio vignette to frame the playhouse stage
  vec2 centered = uv - 0.5;
  float vig = 1.0 - dot(centered, centered) * 0.18;
  finalCol *= clamp(vig, 0.85, 1.0);

  outColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  if (!prog) throw new Error('Failed to create WebGL program');
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

interface FBO {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

export class CartoonWebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private fallback2d: CanvasRenderingContext2D | null = null;
  private bilateralProgram: WebGLProgram | null = null;
  private finalProgram: WebGLProgram | null = null;
  private quadVao: WebGLVertexArrayObject | null = null;
  private sourceTexture: WebGLTexture | null = null;
  private fboA: FBO | null = null;
  private fboB: FBO | null = null;
  private width = 0;
  private height = 0;

  constructor(width = 1280, height = 720) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.initContext(width, height);
  }

  private initContext(width: number, height: number) {
    try {
      const gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      });
      if (!gl) {
        this.fallback2d = this.canvas.getContext('2d');
        return;
      }

      this.gl = gl;
      this.bilateralProgram = createProgram(gl, VERTEX_SHADER, BILATERAL_FRAGMENT);
      this.finalProgram = createProgram(gl, VERTEX_SHADER, CARTOON_FINAL_FRAGMENT);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      const loc = gl.getAttribLocation(this.bilateralProgram, 'a_position');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.quadVao = vao;

      this.sourceTexture = this.createTexture(gl);
      this.resize(width, height);
    } catch (err) {
      console.warn('WebGL2 unavailable, falling back to Canvas2D cartoon filter:', err);
      this.gl = null;
      this.fallback2d = this.canvas.getContext('2d');
    }
  }

  private createTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  private createFBO(gl: WebGL2RenderingContext, width: number, height: number): FBO {
    const texture = this.createTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { framebuffer, texture };
  }

  public resize(width: number, height: number) {
    const w = Math.max(64, Math.round(width));
    const h = Math.max(64, Math.round(height));
    if (w === this.width && h === this.height && (this.fboA || this.fallback2d)) return;

    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;

    const gl = this.gl;
    if (!gl) return;

    if (this.fboA) {
      gl.deleteFramebuffer(this.fboA.framebuffer);
      gl.deleteTexture(this.fboA.texture);
    }
    if (this.fboB) {
      gl.deleteFramebuffer(this.fboB.framebuffer);
      gl.deleteTexture(this.fboB.texture);
    }

    this.fboA = this.createFBO(gl, w, h);
    this.fboB = this.createFBO(gl, w, h);
  }

  public render(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    params: CartoonShaderParams,
    targetWidth: number,
    targetHeight: number
  ): HTMLCanvasElement {
    this.resize(targetWidth, targetHeight);

    const gl = this.gl;
    if (!gl || !this.bilateralProgram || !this.finalProgram || !this.fboA || !this.fboB || !this.sourceTexture) {
      if (this.fallback2d) {
        this.fallback2d.save();
        this.fallback2d.filter = `saturate(${Math.round(params.saturation * 110)}%) contrast(108%) brightness(105%)`;
        this.fallback2d.drawImage(source, 0, 0, this.width, this.height);
        this.fallback2d.restore();
      }
      return this.canvas;
    }

    gl.viewport(0, 0, this.width, this.height);
    gl.bindVertexArray(this.quadVao);

    // Upload current video/image frame
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    const texelX = 1.0 / this.width;
    const texelY = 1.0 / this.height;

    // Pass 1: Bilateral smoothing (source -> FBO A, flips Y from DOM top-down to WebGL bottom-up)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.framebuffer);
    gl.useProgram(this.bilateralProgram);
    gl.uniform1i(gl.getUniformLocation(this.bilateralProgram, 'u_tex'), 0);
    gl.uniform2f(gl.getUniformLocation(this.bilateralProgram, 'u_texelSize'), texelX, texelY);
    gl.uniform1f(gl.getUniformLocation(this.bilateralProgram, 'u_smoothness'), params.smoothness);
    gl.uniform1f(gl.getUniformLocation(this.bilateralProgram, 'u_radiusScale'), 1.0);
    gl.uniform1f(gl.getUniformLocation(this.bilateralProgram, 'u_flipY'), 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Pass 2: Second bilateral refinement pass (FBO A -> FBO B, wider painterly clay surface)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.texture);
    gl.uniform1f(gl.getUniformLocation(this.bilateralProgram, 'u_smoothness'), params.smoothness * 0.92);
    gl.uniform1f(gl.getUniformLocation(this.bilateralProgram, 'u_radiusScale'), 1.65);
    gl.uniform1f(gl.getUniformLocation(this.bilateralProgram, 'u_flipY'), 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Pass 3: 3D Cartoon Lighting, Rim Glow, Soft Toon Ramp & Storybook Ink Contours (FBO B -> Canvas)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.finalProgram);
    gl.bindTexture(gl.TEXTURE_2D, this.fboB.texture);
    gl.uniform1i(gl.getUniformLocation(this.finalProgram, 'u_tex'), 0);
    gl.uniform2f(gl.getUniformLocation(this.finalProgram, 'u_texelSize'), texelX, texelY);
    gl.uniform1f(gl.getUniformLocation(this.finalProgram, 'u_outlineStrength'), params.outlineStrength);
    gl.uniform1f(gl.getUniformLocation(this.finalProgram, 'u_saturation'), params.saturation);
    gl.uniform1f(gl.getUniformLocation(this.finalProgram, 'u_rimGlow'), params.rimGlow);
    gl.uniform1f(gl.getUniformLocation(this.finalProgram, 'u_toonBands'), params.toonBands);
    gl.uniform1f(gl.getUniformLocation(this.finalProgram, 'u_warmth'), params.warmth);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    return this.canvas;
  }

  public dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.fboA) {
      gl.deleteFramebuffer(this.fboA.framebuffer);
      gl.deleteTexture(this.fboA.texture);
    }
    if (this.fboB) {
      gl.deleteFramebuffer(this.fboB.framebuffer);
      gl.deleteTexture(this.fboB.texture);
    }
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
    if (this.bilateralProgram) gl.deleteProgram(this.bilateralProgram);
    if (this.finalProgram) gl.deleteProgram(this.finalProgram);
    this.gl = null;
  }
}
