import * as THREE from 'three';
import { fitFont } from './canvas-font';

interface TextTextureOptions {
  text: string;
  color: string;
  width?: number;
  height?: number;
  fontSize?: number;
  background?: string;
}

/** Desenha um texto centralizado num canvas e o transforma em textura para a cena 3D. */
export function createTextTexture({
  text,
  color,
  width = 256,
  height = 256,
  fontSize = 150,
  background,
}: TextTextureOptions): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d')!;

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  fitFont(context, text, 700, fontSize, width * 0.86);
  context.fillText(text, width / 2, height / 2 + fontSize * 0.04);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}
