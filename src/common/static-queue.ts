export function StaticQueue<T>(size: number) {
  const content = new Array<T | undefined>(size);

  const state = {
    headIdx: 0,
    itemCount: 0,
    tailIndex: 0,
  };

  function removeItem(index: number) {
    content[index] = undefined;
  }

  function moveCurrentHead() {
    state.headIdx++;
  }

  function isEmpty() {
    return state.itemCount === 0;
  }

  function toSlot(index: number) {
    return index % content.length;
  }

  return {
    capacity: () => content.length,
    empty: () => isEmpty(),
    size: () => state.itemCount,
    notFull: () => state.itemCount < content.length,
    add: (item: T) => {
      if (state.itemCount === content.length) {
        throw new QueueFullError();
      }
      const slotIdx = toSlot(state.tailIndex);
      content[slotIdx] = item;
      state.itemCount++;
      state.tailIndex++;
    },
    dequeue: (): T => {
      if (isEmpty()) {
        throw new QueueEmptyError();
      }
      const slotIdx = toSlot(state.headIdx);
      const item = content[slotIdx];
      removeItem(slotIdx);
      moveCurrentHead();
      state.itemCount--;
      return item!;
    },
    peek: (idx: number = 0) => {
      const offset = state.headIdx;
      const slotIdx = toSlot(offset + idx);
      return content[slotIdx];
    },
  };
}

export class QueueFullError extends Error {
  constructor() {
    super('Queue is full');
    this.name = 'QueueFullError';
  }
}

export class QueueEmptyError extends Error {
  constructor() {
    super('Queue is empty');
    this.name = 'QueueEmptyError';
  }
}
