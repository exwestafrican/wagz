import { PreVerification } from '@/generated/prisma/client';

export interface PreVerificationResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  mobile: string;
  status: string;
}

export function toPreverificationResponse(
  preverification: PreVerification,
): PreVerificationResponse {
  return {
    id: preverification.id,
    email: preverification.email,
    firstName: preverification.firstName,
    lastName: preverification.lastName,
    companyName: preverification.companyName,
    mobile: `${preverification.phoneCountryCode}${preverification.phoneNumber}`,
    status: preverification.status,
  };
}
