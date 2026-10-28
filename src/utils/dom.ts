export const appRoot = document.querySelector<HTMLDivElement>('#app')!;

export function queryElement<Element extends HTMLElement = HTMLElement>(selector: string): Element {
  return appRoot.querySelector<Element>(selector)!;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);
}
