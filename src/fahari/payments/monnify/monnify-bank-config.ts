export const MONIEPOINT_BANK_CODE = '50515';

export interface MonnifyBankConfig {
  getAllAvailableBanks: boolean;
  preferredBanks: string[];
}

export function defaultMonnifyBankConfig(): MonnifyBankConfig {
  return {
    getAllAvailableBanks: false,
    preferredBanks: [MONIEPOINT_BANK_CODE],
  };
}
