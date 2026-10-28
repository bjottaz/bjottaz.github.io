import { findCandidate, getCandidatePhoto, getInitials, type Candidate } from '../election/candidates';
import { getRoundOneStatus, type RankedCandidate } from '../election/ranking';
import { appState } from '../state';
import { escapeHtml } from '../utils/dom';

interface AvatarOptions {
  /** Classe extra, por exemplo "large". */
  extraClass?: string;
  /** Fração das preferências (0 a 1) mostrada no anel, como no site do TSE. Sem ela, o anel fica completo. */
  ringShare?: number;
}

/** Foto do candidato num círculo com anel. Sem foto, mostra as iniciais; voto nulo mostra "∅". */
export function renderAvatar(candidateNumber: string | null, { extraClass = '', ringShare = 1 }: AvatarOptions = {}): string {
  const candidate = findCandidate(candidateNumber);
  const content = candidate ? renderAvatarContent(candidate) : `<span class="avatar-initials">∅</span>`;

  return `<span class="avatar ${extraClass}" style="--ring-share:${ringShare}">${content}</span>`;
}

function renderAvatarContent(candidate: Candidate): string {
  const photo = getCandidatePhoto(candidate.number);

  if (!photo) {
    return `<span class="avatar-initials">${getInitials(candidate.shortName)}</span>`;
  }

  return `<img src="${photo}" alt="${escapeHtml(candidate.shortName)}" loading="lazy">`;
}

/** Nome do candidato com partido e número, ou "Nulo". */
export function renderVoteName(candidateNumber: string | null): string {
  const candidate = findCandidate(candidateNumber);

  if (!candidate) {
    return 'Nulo';
  }

  return `${escapeHtml(candidate.shortName)} <small>${candidate.party} – ${candidate.number}</small>`;
}

/** Etiqueta exibida ao lado do candidato que o usuário preferiu ou vetou. */
export function renderVoteMark(candidateNumber: string): string {
  const vote = appState.vote;

  if (vote?.preference === candidateNumber) {
    return ` <span class="vote-mark preference" title="Sua preferência">sua preferência</span>`;
  }

  if (vote?.veto === candidateNumber) {
    return ` <span class="vote-mark veto" title="Seu veto">seu veto</span>`;
  }

  return '';
}

/** Barra que cresce para a direita com pontos positivos e para a esquerda com negativos. */
export function renderDivergingBar(points: number, maxPoints: number): string {
  const widthPercent = (Math.abs(points) / maxPoints) * 50;
  const isNegative = points < 0;
  const anchor = isNegative ? 'right:50%' : 'left:50%';
  const negativeClass = isNegative ? 'negative' : '';

  return `
    <i class="axis"></i>
    <i class="bar ${negativeClass}" style="${anchor};width:${widthPercent}%"></i>`;
}

/** Maior pontuação em valor absoluto, usada como escala das barras. */
export function getMaxAbsolutePoints(rows: RankedCandidate[]): number {
  return Math.max(1, ...rows.map((row) => Math.abs(row.points)));
}

/**
 * Classe de situação no 1º turno: eleito ("elected", verde), passou ("qualified", laranja),
 * vetado ("eliminated", vermelho) ou não passou ("not-qualified", cinza).
 */
export function roundOneClass(row: RankedCandidate): string {
  const status = getRoundOneStatus(row);

  if (status === 'vetoed') {
    return 'eliminated';
  }

  return status;
}

/** Etiqueta de situação: "Eleito" no 1º turno, "2º Turno" para quem segue, "Vetado" e "Não eleito" para quem sai. */
export function renderStatus(row: RankedCandidate): string {
  const status = getRoundOneStatus(row);

  if (status === 'elected') {
    return `<span class="status elected">Eleito</span>`;
  }

  if (status === 'vetoed') {
    return `<span class="status vetoed">Vetado</span>`;
  }

  if (status === 'not-qualified') {
    return `<span class="status not-elected">Não eleito</span>`;
  }

  return `<span class="status advances">2º Turno</span>`;
}
