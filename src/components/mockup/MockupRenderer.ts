import { tileSizePx } from "@/lib/mockupMath";

export type RenderArea = {
  id: string;
  transform: number[];
  soWidthPx: number;
  soHeightPx: number;
  pxPerCm: number;
  fill: boolean;
  warp?: { cols: number; rows: number; points: number[] };
};

export type AreaSetting = { areaId: string; scale: number; offsetX: number; offsetY: number; rotation: number };

export type RenderInput = {
  width: number;
  height: number;
  background: CanvasImageSource | null;
  pattern: CanvasImageSource;
  overlays: Array<{ image: CanvasImageSource; blendMode: string; opacity: number; x: number; y: number }>;
  areas: RenderArea[];
  settings: AreaSetting[];
  rapport: { widthCm: number; heightCm: number } | null;
  sameForAllAreas: boolean;
};

const BLEND: Record<string, GlobalCompositeOperation> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  "soft light": "soft-light",
  "soft-light": "soft-light",
  "color dodge": "color-dodge",
  "color-dodge": "color-dodge",
};

export function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(url));
    image.src = url;
  });
}

export function makeCheckerboard(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const cell = size / 8;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#f4efe6" : "#163a66";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  return canvas;
}

function settingFor(areaId: string, settings: AreaSetting[], same: boolean): AreaSetting {
  if (same) return settings[0] ?? { areaId, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
  return settings.find((item) => item.areaId === areaId) ?? { areaId, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
}

function drawTiles(pattern: CanvasImageSource, soW: number, soH: number, tileW: number, tileH: number, offsetX: number, offsetY: number, rotation: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(soW));
  canvas.height = Math.max(1, Math.round(soH));
  const ctx = canvas.getContext("2d");
  if (!ctx || tileW < 1 || tileH < 1) return canvas;
  ctx.save();
  ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  const span = Math.hypot(canvas.width, canvas.height);
  for (let y = -span; y < canvas.height + span; y += tileH) {
    for (let x = -span; x < canvas.width + span; x += tileW) ctx.drawImage(pattern, x, y, tileW, tileH);
  }
  ctx.restore();
  return canvas;
}

function bilinear(u: number, v: number, quad: number[]) {
  const point = (index: number) => ({ x: quad[index * 2] ?? 0, y: quad[index * 2 + 1] ?? 0 });
  const tl = point(0);
  const tr = point(1);
  const br = point(2);
  const bl = point(3);
  return {
    x: (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x,
    y: (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y,
  };
}

function warpMesh(source: HTMLCanvasElement, width: number, height: number, quad: number[], warp?: RenderArea["warp"]) {
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const gl = output.getContext("webgl2", { premultipliedAlpha: true });
  const cols = warp?.cols ?? 10;
  const rows = warp?.rows ?? 10;
  const positions: number[] = [];
  const uvs: number[] = [];
  const vertex = (u: number, v: number) => {
    let dest = bilinear(u, v, quad);
    if (warp && warp.points.length >= (cols + 1) * (rows + 1) * 2) {
      const cx = Math.round(u * cols);
      const cy = Math.round(v * rows);
      const index = (cy * (cols + 1) + cx) * 2;
      dest = { x: warp.points[index] ?? dest.x, y: warp.points[index + 1] ?? dest.y };
    }
    positions.push((dest.x / width) * 2 - 1, 1 - (dest.y / height) * 2);
    uvs.push(u, v);
  };
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const u0 = x / cols;
      const v0 = y / rows;
      const u1 = (x + 1) / cols;
      const v1 = (y + 1) / rows;
      vertex(u0, v0);
      vertex(u1, v0);
      vertex(u1, v1);
      vertex(u0, v0);
      vertex(u1, v1);
      vertex(u0, v1);
    }
  }
  if (!gl) {
    const ctx = output.getContext("2d");
    if (!ctx) return output;
    const xs = [0, 2, 4, 6].map((index) => quad[index] ?? 0);
    const ys = [1, 3, 5, 7].map((index) => quad[index] ?? 0);
    ctx.drawImage(source, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    return output;
  }
  const program = createProgram(gl);
  gl.useProgram(program);
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  bindAttrib(gl, program, "a_pos", positions, 2);
  bindAttrib(gl, program, "a_uv", uvs, 2);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
  return output;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vertex || !fragment) throw new Error("shader");
  gl.shaderSource(vertex, `#version 300 es
    in vec2 a_pos; in vec2 a_uv; out vec2 v_uv;
    void main(){ v_uv = a_uv; gl_Position = vec4(a_pos, 0.0, 1.0); }`);
  gl.shaderSource(fragment, `#version 300 es
    precision mediump float; uniform sampler2D u_tex; in vec2 v_uv; out vec4 outColor;
    void main(){ outColor = texture(u_tex, v_uv); }`);
  gl.compileShader(vertex);
  gl.compileShader(fragment);
  const program = gl.createProgram();
  if (!program) throw new Error("program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return program;
}

function bindAttrib(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, data: number[], size: number) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

function applyLinearBurn(base: CanvasRenderingContext2D, overlay: CanvasImageSource, opacity: number, x: number, y: number, width: number, height: number) {
  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext("2d");
  if (!ctx) return;
  const under = base.getImageData(x, y, width, height);
  ctx.drawImage(overlay, 0, 0, width, height);
  const over = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < under.data.length; i += 4) {
    const alpha = ((over.data[i + 3] ?? 0) / 255) * opacity;
    for (let channel = 0; channel < 3; channel += 1) {
      const dst = (under.data[i + channel] ?? 0) / 255;
      const src = (over.data[i + channel] ?? 0) / 255;
      const burn = Math.min(1, Math.max(0, src + dst - 1));
      under.data[i + channel] = Math.round((dst * (1 - alpha) + burn * alpha) * 255);
    }
  }
  base.putImageData(under, x, y);
}

export function renderMockup(canvas: HTMLCanvasElement, input: RenderInput) {
  canvas.width = input.width;
  canvas.height = input.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, input.width, input.height);
  if (input.background) ctx.drawImage(input.background, 0, 0, input.width, input.height);
  const areas = input.areas.filter((area) => area.fill);
  for (const area of areas) {
    const setting = settingFor(area.id, input.settings, input.sameForAllAreas);
    const tile = tileSizePx(input.rapport, area.pxPerCm, area.soWidthPx, setting.scale);
    const tiled = drawTiles(input.pattern, area.soWidthPx, area.soHeightPx, tile.w, tile.h, setting.offsetX, setting.offsetY, setting.rotation);
    const warped = warpMesh(tiled, input.width, input.height, area.transform, area.warp);
    ctx.drawImage(warped, 0, 0);
  }
  for (const overlay of input.overlays) {
    if (overlay.blendMode === "linear burn" || overlay.blendMode === "linear-burn") {
      applyLinearBurn(ctx, overlay.image, overlay.opacity, overlay.x, overlay.y, input.width, input.height);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = overlay.opacity;
    ctx.globalCompositeOperation = BLEND[overlay.blendMode] ?? "source-over";
    ctx.drawImage(overlay.image, overlay.x, overlay.y, input.width, input.height);
    ctx.restore();
  }
}
