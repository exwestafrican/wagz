const formattedNaira = /^(\d+)\.(\d{2})$/;

export function formatNaira(major: number, kobo = 0): string {
  if (!Number.isInteger(major) || major < 0) {
    throw new Error('naira must be a whole number of 0 or more');
  }
  if (!Number.isInteger(kobo) || kobo < 0 || kobo > 99) {
    throw new Error('kobo must be a whole number from 0 to 99');
  }
  return `${major}.${kobo.toString().padStart(2, '0')}`;
}

export function toKobo(amount: string): number {
  const match = formattedNaira.exec(amount);
  if (!match) {
    throw new Error('naira amount must use two decimal places');
  }
  const major = Number(match[1]);
  const kobo = Number(match[2]);
  return major * 100 + kobo;
}

export function formatMinorAmount(minorAmount: number): string {
  if (!Number.isInteger(minorAmount) || minorAmount < 0) {
    throw new Error('kobo amount must be a whole number of 0 or more');
  }
  return formatNaira(Math.floor(minorAmount / 100), minorAmount % 100);
}
