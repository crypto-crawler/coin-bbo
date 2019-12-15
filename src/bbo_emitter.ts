import { strict as assert } from 'assert';
import { AskQueue, BidQueue, Order } from './pojo/order_queue';
import { BboMsg } from './pojo/bbo_msg';
import { OrderBookMsg, OrderItem } from './pojo/msg';

export type BboMessageCallback = (msg: BboMsg) => Promise<Boolean>;

export const EXCHANGES = ['Binance', 'Newdex', 'WhaleEx'] as const;
type SupportedExchange = typeof EXCHANGES[number];

export class BboEmitter {
  private static TIMEOUT = 1000 * 60 * 30; // 30 min

  private static MAX_SIZE = 10;

  private pairBbo: { [key: string]: { bestAsks: AskQueue; bestBids: BidQueue } } = {};

  private exchange: SupportedExchange;

  private bboMsgCallBack: BboMessageCallback;

  constructor(exchange: SupportedExchange, bboMsgCallBack: BboMessageCallback) {
    this.exchange = exchange;
    this.bboMsgCallBack = bboMsgCallBack;
  }

  public async addOrderBook(orderBookMsg: OrderBookMsg): Promise<void> {
    if (orderBookMsg.full) {
      orderBookMsg.asks = orderBookMsg.asks.slice(0, 1); // eslint-disable-line no-param-reassign
      orderBookMsg.bids = orderBookMsg.bids.slice(0, 1); // eslint-disable-line no-param-reassign
    }

    if (!(orderBookMsg.pair in this.pairBbo)) {
      this.pairBbo[orderBookMsg.pair] = {
        bestAsks: new AskQueue(),
        bestBids: new BidQueue(),
      };
    }
    this.pairBbo[orderBookMsg.pair].bestAsks.deleteTimeout(BboEmitter.TIMEOUT);
    this.pairBbo[orderBookMsg.pair].bestBids.deleteTimeout(BboEmitter.TIMEOUT);

    const createOrder = (orderItem: OrderItem): Order => ({
      price: orderItem.price,
      quantity: orderItem.quantity,
      timestamp: orderBookMsg.timestamp,
    });

    orderBookMsg.asks.forEach(async orderItem => {
      const order = createOrder(orderItem);
      await this.addOrder(order, orderBookMsg.pair, true, orderBookMsg.full);
    });
    orderBookMsg.bids.forEach(async orderItem => {
      const order = createOrder(orderItem);
      await this.addOrder(order, orderBookMsg.pair, false, orderBookMsg.full);
    });
  }

  private async addOrder(order: Order, pair: string, side: boolean, full: boolean): Promise<void> {
    assert.ok(order.price);
    assert.ok(order.timestamp);

    const queue = side ? this.pairBbo[pair].bestAsks : this.pairBbo[pair].bestBids;

    // price 0 means delete
    if (order.quantity === 0) {
      queue.removeAll(order.price);
      return;
    }

    const prevTop = queue.peek();
    // queue is empty
    if (prevTop === undefined) {
      queue.add(order);
      await this.emitBboMsg(order, pair, side);
      return;
    }

    const existingOrder = queue.find(order.price);
    if (existingOrder && existingOrder.quantity === order.quantity) {
      // mimic incremental orderbook
      return;
    }

    if (full) {
      if (order.price !== prevTop.price || order.quantity !== prevTop.quantity) {
        queue.replaceTop(order);
        await this.emitBboMsg(order, pair, side);
      }
      return;
    }

    if (existingOrder === undefined) {
      if (queue.size < BboEmitter.MAX_SIZE) {
        queue.add(order);
      } else {
        const better = side ? order.price < prevTop.price : order.price > prevTop.price;
        if (better) {
          queue.replaceTop(order);
          await this.emitBboMsg(order, pair, side);
          return;
        }
      }
    } else {
      // quantity changed
      queue.removeAll(order.price);
      queue.add(order);
    }

    const currentTop = queue.peek();
    assert.ok(currentTop !== undefined);

    const better = side ? currentTop!.price < prevTop.price : currentTop!.price > prevTop.price;
    if (better) {
      assert.equal(order.price, currentTop!.price);
      assert.equal(order.quantity, currentTop!.quantity);
      assert.equal(order.timestamp, currentTop!.timestamp);
      await this.emitBboMsg(order, pair, side);
    }
  }

  private async emitBboMsg(order: Order, pair: string, side: boolean): Promise<void> {
    const bboMsg: BboMsg = {
      exchange: this.exchange,
      pair,
      price: order.price,
      quantity: order.quantity,
      side,
      timestamp: order.timestamp,
    };
    await this.bboMsgCallBack(bboMsg);
  }
}
