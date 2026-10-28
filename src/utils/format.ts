const LOCALE = 'pt-BR';
const MINUS_SIGN = '−';

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString(LOCALE);
}

export function formatPercent(value: number, decimals = 2): string {
  const formatted = value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${formatted}%`;
}

/** 3,4M · 326 mil · 15 mil, com sinal de "+" opcional. */
export function formatCompact(value: number, showPlusSign = false): string {
  const sign = getSign(value, showPlusSign);

  return sign + formatCompactAbsolute(Math.abs(value));
}

function getSign(value: number, showPlusSign: boolean): string {
  if (value < 0) {
    return MINUS_SIGN;
  }

  if (showPlusSign && value > 0) {
    return '+';
  }

  return '';
}

function formatCompactAbsolute(value: number): string {
  if (value >= 1e6) {
    const millions = (value / 1e6).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    return `${millions}M`;
  }

  if (value >= 1e3) {
    return `${Math.round(value / 1e3).toLocaleString(LOCALE)} mil`;
  }

  return `${Math.round(value)}`;
}
