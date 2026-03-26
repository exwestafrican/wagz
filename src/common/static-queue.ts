export function StaticQueue<T>(size: number) {
  const content = new Array<T | undefined>(size);

  const state = {
    headIdx: 0,
    itemCount: 0,
    currentIndex: 0,
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

  return {
    capacity: () => content.length,
    empty: () => isEmpty(),
    size: () => state.itemCount,
    add: (item: T) => {
      if (state.itemCount === content.length) {
        throw new QueueFullError();
      }
      content[state.currentIndex % content.length] = item;
      state.itemCount++;
      state.currentIndex++;
    },
    dequeue: () => {
      if (isEmpty()) {
        throw new QueueEmptyError();
      }
      const item = content[state.headIdx];
      removeItem(state.headIdx);
      moveCurrentHead();
      state.itemCount--;
      return item;
    },
    peek: (idx: number = 0) => {
      const offset = state.headIdx;
      return content[(offset + idx) % content.length];
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
