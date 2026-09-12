export const JOB_HANDLER_REGISTRY = Symbol('JOB_HANDLER_REGISTRY');

export interface JobHandler {
  name: string;
  handle(payload: unknown): Promise<void>;
}

export type JobHandlerRegistry = ReturnType<typeof createHandlerRegistry>;

export function createHandlerRegistry() {
  const registeredHandlers: Record<string, JobHandler> = {};

  return {
    register: (handler: JobHandler) => {
      if (registeredHandlers[handler.name]) {
        throw new Error(`Job handler already registered: ${handler.name}`);
      }
      registeredHandlers[handler.name] = handler;
    },

    get: (jobName: string) => {
      return registeredHandlers[jobName];
    },
  };
}

export const JobHandlerRegistryProvider = {
  provide: JOB_HANDLER_REGISTRY,
  useFactory: () => createHandlerRegistry(),
};
