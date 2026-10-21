import { BadRequestException } from '@nestjs/common';

const minorUnitExponents: Record<string, number> = {
  NGN: 2,
  USD: 2,
};

export function toMinorUnits(majorAmount: number, currency: string): number {
  const exponent = minorUnitExponents[currency];
  if (exponent === undefined) {
    throw new BadRequestException(`unsupported currency ${currency}`);
  }

  return majorAmount * 10 ** exponent;
}
