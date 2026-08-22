import { Workspace } from '@/generated/prisma/client';
import { sentenceCase } from '@/common/utils';

export default function cleanWorkspaceName(workspace: Workspace) {
  const partiallyCleanedName = workspace.name
    .split(' ')
    .map((n) => sentenceCase(n))
    .join(' ');

  const words = partiallyCleanedName.split(' ');
  if (words[words.length - 1].toLowerCase() === 'workspace') {
    return words.slice(0, -1).join(' ');
  }
  return words.join(' ');
}
