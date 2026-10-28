// Regras do turno eliminatório (especificação v0.1).
import { CANDIDATES, type Candidate } from './candidates';

/** Voto de um eleitor. `null` significa voto nulo. */
export interface Vote {
  preference: string | null;
  veto: string | null;
}

/** Apuração de uma eleição (real ou simulada). */
export interface Tally {
  scenario: string;
  preferences: Record<string, number>;
  vetoes: Record<string, number>;
  nullPreferences: number;
  nullVetoes: number;
  turnout: number;
  electorate: number;
  /** Voto do usuário, já somado à apuração. */
  userVote: Vote | null;
}

export interface RankedCandidate {
  candidate: Candidate;
  preferences: number;
  vetoes: number;
  points: number;
  /** Vetado: uma das 2 piores pontuações (destacado em vermelho). */
  eliminated: boolean;
  /** Está entre os 2 melhores e passa ao 2º turno. */
  qualified: boolean;
  /** Venceu já no 1º turno (maioria das preferências válidas e pontuação positiva). */
  elected: boolean;
  /** 1 = melhor pontuação. */
  rank: number;
}

export type RoundOneStatus = 'elected' | 'qualified' | 'vetoed' | 'not-qualified';

const ELIMINATED_PER_ROUND = 2;
const MINIMUM_CANDIDATES_TO_ELIMINATE = 4;
/** Só os 2 melhores passam ao 2º turno, que vira um duelo (como no sistema atual). */
export const QUALIFIED_COUNT = 2;

/**
 * Aplica a regra: pontuação = preferências − vetos. Quem tiver mais da metade das preferências válidas
 * e pontuação positiva vence já no 1º turno. Senão, os 2 piores são vetados e só os 2 melhores passam.
 */
export function rankCandidates(tally: Tally): RankedCandidate[] {
  const rows = CANDIDATES.map((candidate) => createRankedCandidate(candidate, tally));
  const sortedByPoints = [...rows].sort(compareByPoints);
  const winner = findMajorityWinner(sortedByPoints);

  sortedByPoints.forEach((row, index) => {
    row.rank = index + 1;
  });

  // Com vencedor no 1º turno não há 2º turno: ninguém passa nem é vetado.
  if (winner) {
    winner.elected = true;

    return sortedByPoints;
  }

  sortedByPoints.forEach((row, index) => {
    row.qualified = index < QUALIFIED_COUNT;
  });

  if (sortedByPoints.length >= MINIMUM_CANDIDATES_TO_ELIMINATE) {
    const worstCandidates = sortedByPoints.slice(-ELIMINATED_PER_ROUND);

    worstCandidates.forEach((row) => {
      row.eliminated = true;
      row.qualified = false;
    });
  }

  return sortedByPoints;
}

function createRankedCandidate(candidate: Candidate, tally: Tally): RankedCandidate {
  const preferences = tally.preferences[candidate.number] ?? 0;
  const vetoes = tally.vetoes[candidate.number] ?? 0;

  return {
    candidate,
    preferences,
    vetoes,
    points: preferences - vetoes,
    eliminated: false,
    qualified: false,
    elected: false,
    rank: 0,
  };
}

/** Mais da metade das preferências válidas (sem nulos) e mais preferências que vetos. Só um pode ter maioria. */
function findMajorityWinner(rows: RankedCandidate[]): RankedCandidate | undefined {
  const validPreferences = rows.reduce((total, row) => total + row.preferences, 0);

  return rows.find((row) => row.preferences * 2 > validPreferences && row.points > 0);
}

/** Vencedor do 1º turno, se houver. */
export function getFirstRoundWinner(rows: RankedCandidate[]): RankedCandidate | undefined {
  return rows.find((row) => row.elected);
}

/** Eleito no 1º turno, passou ao 2º turno, foi vetado (2 piores) ou não passou (fora dos 2 melhores). */
export function getRoundOneStatus(row: RankedCandidate): RoundOneStatus {
  if (row.elected) {
    return 'elected';
  }

  if (row.eliminated) {
    return 'vetoed';
  }

  return row.qualified ? 'qualified' : 'not-qualified';
}

/** Maior pontuação primeiro. Em caso de empate, passa quem tiver mais preferências. */
function compareByPoints(first: RankedCandidate, second: RankedCandidate): number {
  const pointsDifference = second.points - first.points;

  if (pointsDifference !== 0) {
    return pointsDifference;
  }

  return second.preferences - first.preferences;
}

export function getTotalPreferences(tally: Tally): number {
  return sumValues(tally.preferences);
}

export function getTotalVetoes(tally: Tally): number {
  return sumValues(tally.vetoes);
}

function sumValues(votesByCandidate: Record<string, number>): number {
  return Object.values(votesByCandidate).reduce((total, votes) => total + votes, 0);
}
