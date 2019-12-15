import each from 'jest-each';
import { AskQueue, askComparator, BidQueue, bidComparator } from '../../src/pojo/order_queue';
import {
  order,
  orderWithDifferentPrice,
  orderWithDifferentQuantity,
  orderWithDifferentTimestamp,
} from './orders';

each([
  [askComparator, orderWithDifferentQuantity],
  [askComparator, orderWithDifferentTimestamp],
  [bidComparator, orderWithDifferentQuantity],
  [bidComparator, orderWithDifferentTimestamp],
]).test(
  'Fields exchange, quantity and timestamp behave the same in ask and bid',
  (compare, otherOrder) => {
    expect(compare(order, otherOrder)).toBe(false); // eslint-disable-line jest/no-standalone-expect
    expect(compare(otherOrder, order)).toBe(true); // eslint-disable-line jest/no-standalone-expect
  },
);

test('price behaves different in ask and bid', () => {
  expect(askComparator(order, orderWithDifferentPrice)).toBe(true);
  expect(askComparator(orderWithDifferentPrice, order)).toBe(false);

  expect(bidComparator(order, orderWithDifferentPrice)).toBe(false);
  expect(bidComparator(orderWithDifferentPrice, order)).toBe(true);
});

each([
  [new AskQueue(), orderWithDifferentPrice, false],
  [new AskQueue(), orderWithDifferentQuantity, false],
  [new AskQueue(), orderWithDifferentTimestamp, false],
  [new BidQueue(), orderWithDifferentPrice, false],
  [new BidQueue(), orderWithDifferentQuantity, false],
  [new BidQueue(), orderWithDifferentTimestamp, false],
]).test('should not include', (queue, otherOrder, expected) => {
  queue.add(order);
  expect(queue.remove(otherOrder)).toBe(expected); // eslint-disable-line jest/no-standalone-expect
});
