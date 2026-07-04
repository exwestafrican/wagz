import { Workspace } from '@/generated/prisma/client';

export default interface BackfillTask {
  run(workspace: Workspace): Promise<void>;
}

type TaskEntry = {
  name: string;
  description: string;
  task: BackfillTask;
};

export type TaskDetails = {
  id: string;
  name: string;
  description: string;
};

export function createTaskRegistry() {
  const registeredTasks: Record<string, TaskEntry> = {};
  return {
    register: (detail: {
      name: string;
      description: string;
      key: string;
      dateAdded: number;
      task: BackfillTask;
    }) => {
      registeredTasks[detail.key] = {
        name: detail.name,
        description: detail.description,
        task: detail.task,
      };
    },

    get: (key: string) => {
      const taskEntry = registeredTasks[key];
      if (!taskEntry) {
        throw new Error('Task not registered');
      }
      return taskEntry.task;
    },

    all: () => {
      return Object.entries(registeredTasks).map(([key, task]) => ({
        id: key,
        name: task.name,
        description: task.description,
      }));
    },
  };
}
