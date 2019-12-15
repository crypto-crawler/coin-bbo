/* eslint-disable max-classes-per-file */
import FastPriorityQueue from 'fastpriorityqueue';

export interface Order {
  price: number;
  quantity: number;
  timestamp: number;
}

export const askComparator = (x: Order, y: Order) => {
  if (x.price !== y.price) {
    return x.price < y.price;
  }
  if (x.timestamp !== y.timestamp) {
    return x.timestamp > y.timestamp;
  }
  return x.quantity > y.quantity;
};

export const bidComparator = (x: Order, y: Order) => {
  if (x.price !== y.price) {
    return x.price > y.price;
  }
  if (x.timestamp !== y.timestamp) {
    return x.timestamp > y.timestamp;
  }
  return x.quantity > y.quantity;
};

export class OrderQueue extends FastPriorityQueue<Order> {
  public find(price: number): Order | undefined {
    let result: Order | undefined;
    this.forEach(order => {
      if (order.price === price) {
        result = order;
      }
    });
    return result;
  }

  public removeAll(price: number): Order[] {
    return this.removeMany(x => x.price === price);
  }

  public deleteTimeout(timeoutThreshold: number): void {
    const now = Date.now();
    while (!this.isEmpty()) {
      const top = this.peek()!;
      if (now - top.timestamp > timeoutThreshold) {
        this.poll();
      } else {
        break;
      }
    }
  }
}

export class AskQueue extends OrderQueue {
  constructor() {
    super(askComparator);
  }
}

export class BidQueue extends OrderQueue {
  constructor() {
    super(bidComparator);
  }
}
