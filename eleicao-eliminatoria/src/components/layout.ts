import { roundLink, ROUTES, toHash } from '../routes';

export type NavigationItem = 'home' | 'votingBooth' | 'results';

const NAVIGATION_ITEMS: { id: NavigationItem; label: string }[] = [
  { id: 'home', label: 'Início' },
  { id: 'votingBooth', label: 'Votar' },
  { id: 'results', label: 'Resultados' },
];

export function renderLayout(content: string, activeItem: NavigationItem | null = null): string {
  return `
    ${renderHeader(activeItem)}
    <main>${content}</main>
    ${renderFooter()}`;
}

function renderHeader(activeItem: NavigationItem | null): string {
  const navigationLinks = NAVIGATION_ITEMS.map((item) => {
    const activeClass = item.id === activeItem ? 'active' : '';

    return `<a href="${toHash(ROUTES[item.id])}" class="${activeClass}">${item.label}</a>`;
  });

  return `
    <div class="top-banner"><span>Simulador · não é um site oficial</span></div>
    <header class="site-header">
      <a class="logo" href="${toHash(ROUTES.home)}">
        <span class="logo-title">ELEIÇÕES</span>
        <span class="logo-year">2026</span>
        <span class="logo-hashtag">#VOTOELIMINATÓRIO</span>
      </a>
      <div class="election-title">Eleição <b>Eliminatória 2026</b></div>
      <nav>${navigationLinks.join('')}</nav>
    </header>`;
}

function renderFooter(): string {
  return `
    <footer class="site-footer">
      <div class="waves"></div>
      <div class="footer-content">
        <span>Preferências: TSE, 1º turno de 4/10/2026 · vetos: hipótese do autor</span>
        <span>Eleição eliminatória · especificação v0.1</span>
      </div>
    </footer>`;
}

const ROUNDS = [1, 2];

interface LocationFiltersOptions {
  selectedRound?: number;
  /** Turnos que já têm resultado (os outros aparecem apagados). */
  availableRounds?: number;
}

/** Barra de local e turno, como no painel oficial de resultados. */
export function renderLocationFilters({ selectedRound = 1, availableRounds = 1 }: LocationFiltersOptions = {}): string {
  const roundButtons = ROUNDS.map((round) => {
    const label = `${round}º`;

    if (round > availableRounds) {
      return `<span class="disabled" title="Turno ainda não simulado">${label}</span>`;
    }

    const selectedClass = round === selectedRound ? 'selected' : '';

    return `<a class="${selectedClass}" href="${roundLink(ROUTES.results, round)}">${label}</a>`;
  });

  return `
    <div class="filters">
      <div class="location"><span class="pin">●</span> Brasil</div>
      <div class="round">
        <span>Turno</span>
        <div>${roundButtons.join('')}</div>
      </div>
    </div>`;
}

export function renderOfficeBadge(): string {
  return `<span class="office-badge">PRESIDENTE</span>`;
}
