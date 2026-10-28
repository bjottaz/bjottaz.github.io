// Cabeçalho de um grupo de eleitores que muda de voto: um candidato, os não eleitos (agrupados) ou quem anulou.
import { findCandidate } from '../election/candidates';
import { NOT_ELECTED_SOURCE_KEY, type TransferSource } from '../election/runoff';
import { NULL_PREFERENCE_KEY } from '../election/simulation';
import { escapeHtml } from '../utils/dom';
import { renderAvatar } from './candidate';

export function getSourceTitle(source: TransferSource, round: number): string {
  if (source.key === NULL_PREFERENCE_KEY) {
    return `Quem anulou no ${round - 1}º turno`;
  }

  if (source.key === NOT_ELECTED_SOURCE_KEY) {
    return 'Eleitores dos não eleitos';
  }

  return `Eleitores de ${escapeHtml(findCandidate(source.key)?.shortName ?? source.key)}`;
}

/** Avatar do grupo: o candidato, o "∅" do Nulo ou os avatares dos não eleitos sobrepostos. */
export function renderSourceAvatar(source: TransferSource): string {
  if (source.key === NOT_ELECTED_SOURCE_KEY) {
    const avatars = source.members.map((candidateNumber) => renderAvatar(candidateNumber, { extraClass: 'small' }));

    return `<span class="avatar-stack">${avatars.join('')}</span>`;
  }

  return renderAvatar(source.key === NULL_PREFERENCE_KEY ? null : source.key);
}

/** Nomes dos não eleitos do grupo, em texto pequeno. */
export function renderSourceMembers(source: TransferSource): string {
  if (source.members.length === 0) {
    return '';
  }

  const names = source.members.map((candidateNumber) => escapeHtml(findCandidate(candidateNumber)?.shortName ?? candidateNumber));

  return `<small class="source-members">${names.join(', ')}</small>`;
}
