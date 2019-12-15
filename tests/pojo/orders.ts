import { Order } from '../../src/pojo/order_queue';

export const order: Order = {
  price: 7404.35,
  quantity: 2.9736,
  timestamp: 1575961821882,
};

export const orderWithDifferentTimestamp: Order = {
  price: 7404.35,
  quantity: 2.9736,
  timestamp: 1575961821883,
};

export const orderWithDifferentExchange: Order = {
  price: 7404.35,
  quantity: 2.9736,
  timestamp: 1575961821882,
};

export const orderWithDifferentPrice: Order = {
  price: 8404.35,
  quantity: 2.9736,
  timestamp: 1575961821882,
};

export const orderWithDifferentQuantity: Order = {
  price: 7404.35,
  quantity: 3.9736,
  timestamp: 1575961821882,
};
