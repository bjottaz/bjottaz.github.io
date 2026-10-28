export interface Candidate {
  number: string;
  /** Nome curto, usado nas tabelas. */
  shortName: string;
  /** Nome como aparece na urna. */
  ballotName: string;
  party: string;
}

export const CANDIDATES: Candidate[] = [
  { number: '22', shortName: 'Flávio Bolsonaro', ballotName: 'FLAVIO BOLSONARO', party: 'PL' },
  { number: '13', shortName: 'Lula', ballotName: 'LULA', party: 'PT' },
  { number: '70', shortName: 'Augusto Cury', ballotName: 'ESCRITOR AUGUSTO CURY', party: 'AVANTE' },
  { number: '14', shortName: 'Renan Santos', ballotName: 'RENAN SANTOS', party: 'MISSÃO' },
  { number: '55', shortName: 'Ronaldo Caiado', ballotName: 'RONALDO CAIADO', party: 'PSD' },
  { number: '30', shortName: 'Zema', ballotName: 'ZEMA', party: 'NOVO' },
  { number: '80', shortName: 'Samara', ballotName: 'SAMARA', party: 'UP' },
  { number: '16', shortName: 'Hertz Dias', ballotName: 'HERTZ DIAS', party: 'PSTU' },
  { number: '27', shortName: 'Clariana Barão', ballotName: 'CLARIANA BARAO', party: 'DC' },
  { number: '21', shortName: 'Edmilson Costa', ballotName: 'EDMILSON COSTA', party: 'PCB' },
  { number: '35', shortName: 'Wilson Grassi', ballotName: 'VETERINÁRIO WILSON GRASSI', party: 'DEMOCRATA' },
  { number: '29', shortName: 'Rui Costa Pimenta', ballotName: 'RUI COSTA PIMENTA', party: 'PCO' },
];

export const CANDIDATE_NUMBER_LENGTH = 2;

/** Fotos oficiais do TSE, salvas como `assets/candidates/<número>.jpeg`. */
const PHOTOS_BY_PATH = import.meta.glob<string>('../assets/candidates/*.jpeg', { eager: true, import: 'default' });

export function getCandidatePhoto(candidateNumber: string): string | undefined {
  return PHOTOS_BY_PATH[`../assets/candidates/${candidateNumber}.jpeg`];
}

export function findCandidate(candidateNumber: string | null): Candidate | undefined {
  return CANDIDATES.find((candidate) => candidate.number === candidateNumber);
}

/** "Rui Costa Pimenta" → "CP". Palavras curtas como "da" ou "de" são ignoradas. */
export function getInitials(name: string): string {
  const relevantWords = name.split(' ').filter((word) => word.length > 2);

  const initials = relevantWords
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return initials || name[0];
}
