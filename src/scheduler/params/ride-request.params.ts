import { InputJsonSerializable } from '@/scheduler/input-json-serializable';
import { InputJsonObject, JsonValue } from '@prisma/client/runtime/client';

export default class RideRequestParams implements InputJsonSerializable {
  constructor(
    readonly rideRequestId: number,
    readonly experienceCode: string,
  ) {}

  toInputJson(): InputJsonObject {
    return {
      rideRequestId: this.rideRequestId,
      experienceCode: this.experienceCode,
    };
  }

  static fromJsonValue(value: JsonValue): RideRequestParams {
    const { rideRequestId, experienceCode } = value as {
      rideRequestId: number;
      experienceCode: string;
    };
    return new RideRequestParams(rideRequestId, experienceCode);
  }

  static of(rideRequestId: number, experienceCode: string) {
    return new RideRequestParams(rideRequestId, experienceCode);
  }
}
