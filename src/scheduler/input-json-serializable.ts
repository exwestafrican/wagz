import { InputJsonObject } from '@prisma/client/runtime/client';

export interface InputJsonSerializable {
  toInputJson(): InputJsonObject;
}
