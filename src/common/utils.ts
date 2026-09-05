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

export function repeat(n: number, fn: () => void): void {
  for (let i = 0; i < n; i++) {
    fn();
  }
}

export function repeatFn<T>(
  n: number,
  fn: () => Promise<T>,
): (() => Promise<T>)[] {
  return Array.from({ length: n }, () => fn);
}

export function isSame<T>(left: T, right: T): boolean {
  return left === right;
}

export function last<T>(items: T[]): T | undefined {
  if (isEmpty(items)) return undefined;
  return items[items.length - 1];
}

export function first<T>(items: T[]): T | undefined {
  if (isEmpty(items)) return undefined;
  return items[0];
}

export function firstOrThrow<T>(items: T[]): T {
  const firstItem = first(items);
  if (firstItem === undefined)
    throw new Error('First item cannot be undefined');
  return firstItem;
}

export function lastOrThrow<T>(items: T[]): T {
  const lastItem = last(items);
  if (lastItem === undefined) throw Error('Last Item cannot be undefined');
  return lastItem;
}

export function average(array: number[]): number {
  return (
    array.reduce((sum, currentValue) => sum + currentValue, 0) / array.length
  );
}

export function sum(numbers: number[]) {
  return numbers.reduce((partialSum, a) => partialSum + a, 0);
}
