// As URLs ficam em português porque o site é em português.
export const ROUTES = {
  home: '/',
  votingBooth: '/urna',
  voteRecorded: '/computado',
  simulation: '/simular',
  results: '/resultados',
} as const;

export const RESULTS_TAB_PARAM = 'aba';
export const ROUND_PARAM = 'turno';

export function toHash(path: string): string {
  return `#${path}`;
}

export function resultsTabLink(tabSlug: string): string {
  return `${toHash(ROUTES.results)}?${RESULTS_TAB_PARAM}=${tabSlug}`;
}

/** Link para um turno na simulação ou nos resultados (o 1º turno não precisa do parâmetro). */
export function roundLink(path: string, round: number): string {
  return round === 1 ? toHash(path) : `${toHash(path)}?${ROUND_PARAM}=${round}`;
}

/** Lê o turno da URL: "2" é o 2º turno; qualquer outra coisa vira 1. */
export function parseRound(value: string | null): 1 | 2 {
  return value === '2' ? 2 : 1;
}

export function navigateTo(path: string) {
  location.hash = toHash(path);
}
