import { faker } from '@faker-js/faker';

const AMBIGUOUS_CHARS = ['i', 'l', '1', 'L', 'o', '0', 'O'] as const;

export function sixCharHumanFriendlyCode(): string {
  return faker.string.alphanumeric({
    length: 6,
    exclude: [...AMBIGUOUS_CHARS],
  });
}
