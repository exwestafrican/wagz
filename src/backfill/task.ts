import { Workspace } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NormalizeUsernames } from '@/backfill/tasks/normalize-username';

export default interface BackfillTask {
  run(workspace: Workspace): Promise<void>;
}

type TaskEntry = {
  name: string;
  description: string;
  create: (prisma: PrismaService) => BackfillTask;
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
      Task: new (prisma: PrismaService) => BackfillTask;
    }) => {
      registeredTasks[detail.key] = {
        name: detail.name,
        description: detail.description,
        create: (prisma: PrismaService) => new detail.Task(prisma),
      };
    },

    get: (key: string, prisma: PrismaService) => {
      const task = registeredTasks[key];
      if (!task) {
        throw new Error('Task not registered');
      }
      return task.create(prisma);
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

export function registerBackfillTasks(
  registry: ReturnType<typeof createTaskRegistry>,
) {
  registry.register({
    name: 'Backfill Normalize Usernames',
    description:
      'Removes special characters from username and stores in normalized format',
    key: 'normalize_usernames',
    Task: NormalizeUsernames,
  });
}
