export function indexBy<T>(
  array: T[],
  getKey: (item: T) => string,
): Map<string, T> {
  return new Map(array.map((item) => [getKey(item), item]));
}

export const Time = {
  durationInMilliseconds: {
    milliseconds(value: number) {
      return value;
    },
    seconds(value: number) {
      return value * 1000;
    },
    minutes(value: number) {
      return value * 60 * 1000;
    },
    hours(value: number) {
      return value * 60 * 60 * 1000;
    },
    days(value: number) {
      return value * 24 * 60 * 60 * 1000;
    },
  },
  durationInSeconds: {
    minutes(value: number) {
      return value * 60;
    },
  },
};

export function isEmpty(obj: object | null | undefined): boolean {
  if (!obj) return true;
  return Object.keys(obj).length === 0;
}

export function groupBy<T, V>(array: T[], getKey: (item: T) => V): Map<V, T[]> {
  return array.reduce((acc: Map<V, T[]>, item) => {
    const key = getKey(item);
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key)!.push(item);
    return acc;
  }, new Map<V, T[]>());
}

export function sentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
}
