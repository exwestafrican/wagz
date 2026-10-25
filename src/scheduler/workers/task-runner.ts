import { JsonValue } from '@prisma/client/runtime/client';

export default interface TaskRunner {
  run(params: JsonValue): Promise<void>; //TODO: we should probably take in appId or something
}
