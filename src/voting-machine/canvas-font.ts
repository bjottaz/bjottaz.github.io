// Fontes para desenhar texto em canvas 2D (sem Three.js, usado também pela urna 2D).
const FONT_FAMILY = 'Inter, Arial, sans-serif';
const MINIMUM_FONT_SIZE = 17;

export function setFont(context: CanvasRenderingContext2D, weight: number, size: number) {
  context.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

/** Diminui a fonte até o texto caber em `maxWidth`. */
export function fitFont(context: CanvasRenderingContext2D, text: string, weight: number, initialSize: number, maxWidth: number) {
  let size = initialSize;

  setFont(context, weight, size);

  while (context.measureText(text).width > maxWidth && size > MINIMUM_FONT_SIZE) {
    size--;
    setFont(context, weight, size);
  }
}
