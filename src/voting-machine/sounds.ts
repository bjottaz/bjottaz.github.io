// Sons da urna: bipes sintetizados para as teclas e áudios gravados para confirmar e terminar.
import confirmSoundUrl from '../assets/confirma.mp3';
import finishSoundUrl from '../assets/fim.mp3';

const confirmSound = new Audio(confirmSoundUrl);
const finishSound = new Audio(finishSoundUrl);

let audioContext: AudioContext | null = null;

function playTone(frequency: number, delaySeconds: number, durationSeconds: number, volume = 0.08) {
  audioContext ??= new AudioContext();

  const startTime = audioContext.currentTime + delaySeconds;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.setValueAtTime(0, startTime + durationSeconds);

  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + durationSeconds + 0.02);
}

export function playKeySound() {
  playTone(1100, 0, 0.06);
}

export function playErrorSound() {
  playTone(300, 0, 0.12);
  playTone(250, 0.14, 0.18);
}

/** Som da tecla CONFIRMA ao passar da preferência para o veto. */
export function playConfirmSound() {
  playRecordedSound(confirmSound);
}

/** O famoso som de "fim" da urna, tocado ao terminar o voto. */
export function playFinishSound() {
  playRecordedSound(finishSound);
}

function playRecordedSound(sound: HTMLAudioElement) {
  sound.currentTime = 0;

  // O navegador pode bloquear o áudio; o voto continua funcionando sem som.
  sound.play().catch(() => {});
}
