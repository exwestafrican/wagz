import {
  StaticQueue,
  QueueEmptyError,
  QueueFullError,
} from '@/common/static-queue';

describe('Queue', () => {
  describe('size', () => {
    it('tells the capacity of the queue', () => {
      const queue = StaticQueue(10);
      expect(queue.capacity()).toBe(10);
    });
  });

  describe('Add', () => {
    it('can add multiple items to the queue', () => {
      const queue = StaticQueue<number>(10);
      expect(queue.size()).toBe(0);
      queue.add(2);
      expect(queue.size()).toBe(1);
      queue.add(8);
      expect(queue.size()).toBe(2);
    });

    it('throws exception when queue is full', () => {
      const queue = StaticQueue<number>(1);
      queue.add(1);
      expect(() => {
        queue.add(90);
      }).toThrow(QueueFullError);
    });

    it('allocates item to empty slot', () => {
      const queue = StaticQueue<number>(3);
      expect(queue.capacity()).toBe(3);
      queue.add(56);
      queue.add(18);
      queue.add(67);
      queue.dequeue();
      expect(queue.size()).toBe(2);
      expect(queue.peek()).toBe(18);
      expect(queue.peek(1)).toBe(67);
      queue.add(19);
      expect(queue.peek()).toBe(18);
      expect(queue.peek(1)).toBe(67);
      expect(queue.peek(2)).toBe(19);
      expect(queue.capacity()).toBe(3);
    });

    it('fills queue round and throws exception when full', () => {
      const queue = StaticQueue<number>(3);
      expect(queue.capacity()).toBe(3);
      queue.add(56);
      queue.add(18);
      queue.add(67);
      queue.dequeue();
      queue.add(19);
      expect(() => {
        queue.add(190);
      }).toThrow(QueueFullError);
    });
  });

  describe('peek', () => {
    it('can peek latest item in queue', () => {
      const queue = StaticQueue<number>(5);
      expect(queue.peek()).toBe(undefined);
      queue.add(2);
      expect(queue.peek()).toBe(2);
      queue.add(8);
      expect(queue.peek()).toBe(2);
      queue.add(7);
      queue.add(99);
      queue.add(100);
      expect(queue.peek()).toBe(2);
    });

    it('does not remove item from queue', () => {
      const queue = StaticQueue<number>(5);
      queue.add(1);
      queue.add(2);
      queue.peek();
      expect(queue.size()).toBe(2);
    });
  });

  describe('dequeue', () => {
    it('removes the item at head of queue and moves head', () => {
      const queue = StaticQueue<number>(3);
      queue.add(9);
      queue.add(3);

      expect(queue.peek()).toBe(9);
      queue.dequeue();
      expect(queue.peek()).toBe(3);
    });

    it('throws queue empty exception when no item in queue', () => {
      const queue = StaticQueue<number>(3);
      queue.add(9);
      queue.add(3);

      queue.dequeue();
      queue.dequeue();

      expect(() => {
        queue.dequeue();
      }).toThrow(QueueEmptyError);
    });
  });
});
