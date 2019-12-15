import { AskQueue, BidQueue } from '../../src/pojo/order_queue';
import { order, orderWithDifferentPrice } from './orders';

test('top is smallest', () => {
  const askQueue = new AskQueue();
  askQueue.add(order);
  askQueue.add(orderWithDifferentPrice);

  expect(askQueue.peek()!.price).toBeLessThan(orderWithDifferentPrice.price);
});

test('top is largest', () => {
  const bidQueue = new BidQueue();
  bidQueue.add(order);
  bidQueue.add(orderWithDifferentPrice);

  expect(bidQueue.peek()!.price).toBeGreaterThan(order.price);
});

test('find', () => {
  const bidQueue = new BidQueue();
  bidQueue.add(order);

  expect(bidQueue.find(order.price)).toBe(order);

  const askQueue = new AskQueue();
  askQueue.add(order);

  expect(askQueue.find(order.price)).toBe(order);
});

test('removeAll', () => {
  const bidQueue = new BidQueue();
  bidQueue.add(order);
  bidQueue.add(orderWithDifferentPrice);

  expect(bidQueue.size).toBe(2);

  const removed = bidQueue.removeAll(order.price);

  expect(bidQueue.size).toBe(1);
  expect(removed).toEqual([order]);
});
