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
    seconds(value) {
      return value * 1000;
    },
    minutes(value) {
      return value * 60 * 1000;
    },
    hours(value) {
      return value * 60 * 60 * 1000;
    },
    days(value) {
      return value * 24 * 60 * 60 * 1000;
    },
  },
};

export function isEmpty(obj: object | null | undefined): boolean {
  if (!obj) return true;
  return Object.keys(obj).length === 0;
}

export function groupBy<T>(
  array: T[],
  getKey: (item: T) => string,
): Map<string, T[]> {
  return array.reduce((acc: Map<string, T[]>, item) => {
    const key = getKey(item);
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key)!.push(item);
    return acc;
  }, new Map<string, T[]>());
}
