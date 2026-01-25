import { PreVerification } from '@prisma/client';

export interface Step<T> {
  take(preVerification: PreVerification): Promise<T>;
}
