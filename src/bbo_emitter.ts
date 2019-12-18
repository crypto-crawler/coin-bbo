import { strict as assert } from 'assert';
import { OrderBookMsg, OrderItem, BboMsg } from 'crypto-crawler';
import { SupportedExchange } from 'crypto-crawler/dist/crawler';
import { AskQueue, BidQueue, Order } from './pojo/order_queue';

export type BboMessageCallback = (msg: BboMsg) => Promise<void>;

export class BboEmitter {
  private static TIMEOUT = 1000 * 60 * 30; // 30 min

  private static MAX_SIZE = 10;

  private pairBbo: { [key: string]: { lowestAsks: AskQueue; highestBids: BidQueue } } = {};

  private exchange: SupportedExchange;

  private bboMsgCallBack: BboMessageCallback;

  constructor(exchange: SupportedExchange, bboMsgCallBack: BboMessageCallback) {
    this.exchange = exchange;
    this.bboMsgCallBack = bboMsgCallBack;
  }

  public async addOrderBook(orderBookMsg: OrderBookMsg): Promise<void> {
    this.init(orderBookMsg.pair);
    const prevLowestAsk = this.pairBbo[orderBookMsg.pair].lowestAsks.peek();
    const prevHighestBid = this.pairBbo[orderBookMsg.pair].highestBids.peek();

    if (orderBookMsg.full) {
      const msg: BboMsg = {
        exchange: orderBookMsg.exchange,
        channel: orderBookMsg.channel,
        pair: orderBookMsg.pair,
        timestamp: orderBookMsg.timestamp,
        raw: '',
        bidPrice: orderBookMsg.bids[0].price,
        bidQuantity: orderBookMsg.bids[0].quantity,
        askPrice: orderBookMsg.asks[0].price,
        askQuantity: orderBookMsg.asks[0].quantity,
      };
      await this.addBboMsg(msg);
      return;
    }

    const createOrder = (orderItem: OrderItem): Order => ({
      price: orderItem.price,
      quantity: orderItem.quantity,
      timestamp: orderBookMsg.timestamp,
    });

    orderBookMsg.asks.forEach(async orderItem => {
      const order = createOrder(orderItem);
      await this.addOrder(order, orderBookMsg.pair, true);
    });
    orderBookMsg.bids.forEach(async orderItem => {
      const order = createOrder(orderItem);
      await this.addOrder(order, orderBookMsg.pair, false);
    });

    const curLowestAsk = this.pairBbo[orderBookMsg.pair].lowestAsks.peek();
    const curHighestBid = this.pairBbo[orderBookMsg.pair].highestBids.peek();
    const result = BboEmitter.emitBboMsg(
      this.exchange,
      orderBookMsg.pair,
      prevLowestAsk,
      prevHighestBid,
      curLowestAsk,
      curHighestBid,
      false,
    );
    if (result) await this.bboMsgCallBack(result);
  }

  public async addBboMsg(bboMsg: BboMsg): Promise<void> {
    assert.equal(bboMsg.exchange, this.exchange);
    this.init(bboMsg.pair);
    const prevLowestAsk = this.pairBbo[bboMsg.pair].lowestAsks.peek();
    const prevHighestBid = this.pairBbo[bboMsg.pair].highestBids.peek();

    this.pairBbo[bboMsg.pair].lowestAsks.replaceTopOrAdd({
      price: bboMsg.askPrice,
      quantity: bboMsg.askQuantity,
      timestamp: bboMsg.timestamp,
    });
    this.pairBbo[bboMsg.pair].highestBids.replaceTopOrAdd({
      price: bboMsg.bidPrice,
      quantity: bboMsg.bidQuantity,
      timestamp: bboMsg.timestamp,
    });

    const curLowestAsk = this.pairBbo[bboMsg.pair].lowestAsks.peek();
    const curHighestBid = this.pairBbo[bboMsg.pair].highestBids.peek();
    const result = BboEmitter.emitBboMsg(
      this.exchange,
      bboMsg.pair,
      prevLowestAsk,
      prevHighestBid,
      curLowestAsk,
      curHighestBid,
      true,
    );
    if (result) await this.bboMsgCallBack(result);
  }

  private init(pair: string) {
    if (!(pair in this.pairBbo)) {
      this.pairBbo[pair] = {
        lowestAsks: new AskQueue(),
        highestBids: new BidQueue(),
      };
    }
    this.pairBbo[pair].lowestAsks.deleteTimeout(BboEmitter.TIMEOUT);
    this.pairBbo[pair].highestBids.deleteTimeout(BboEmitter.TIMEOUT);
  }

  // Added orders from OrderBookUpdate
  private async addOrder(order: Order, pair: string, side: boolean): Promise<void> {
    assert.ok(order.price);
    assert.ok(order.timestamp);

    const queue = side ? this.pairBbo[pair].lowestAsks : this.pairBbo[pair].highestBids;

    // price 0 means delete
    if (order.quantity === 0) {
      queue.removeAll(order.price);
      return;
    }

    const prevTop = queue.peek();
    // queue is empty
    if (prevTop === undefined) {
      queue.add(order);
      // await this.emitBboMsg(order, pair, side);
      return;
    }

    const existingOrder = queue.find(order.price);
    if (existingOrder && existingOrder.quantity === order.quantity) {
      // mimic incremental orderbook
      return;
    }

    if (existingOrder === undefined) {
      if (queue.size < BboEmitter.MAX_SIZE) {
        queue.add(order);
      } else {
        const better = side ? order.price < prevTop.price : order.price > prevTop.price;
        if (better) {
          queue.replaceTop(order);
          // await this.emitBboMsg(order, pair, side);
        }
      }
    } else {
      // quantity changed
      queue.removeAll(order.price);
      queue.add(order);
    }
  }

  private static emitBboMsg(
    exchange: string,
    pair: string,
    prevLowestAsk: Order | undefined,
    prevHighestBid: Order | undefined,
    curLowestAsk: Order | undefined,
    curHighestBid: Order | undefined,
    force: boolean,
  ): BboMsg | undefined {
    if (curLowestAsk === undefined || curHighestBid === undefined) return undefined;

    let changed = false;
    if (prevLowestAsk === undefined || prevHighestBid === undefined) {
      changed = true;
    } else if (
      prevLowestAsk!.price > curLowestAsk!.price ||
      prevLowestAsk!.quantity !== curLowestAsk!.quantity ||
      prevHighestBid!.price < curHighestBid!.price ||
      prevHighestBid!.quantity !== curHighestBid!.quantity
    ) {
      changed = true;
    }

    if (!changed && !force) return undefined;

    let lowestAsk: Order = curLowestAsk;
    if (!force && prevLowestAsk !== undefined && prevLowestAsk!.price < curLowestAsk!.price) {
      lowestAsk = prevLowestAsk;
    }

    let highestBid: Order = curHighestBid;
    if (!force && prevHighestBid !== undefined && prevHighestBid!.price > curHighestBid!.price) {
      highestBid = prevHighestBid;
    }

    // No change
    if (
      prevLowestAsk &&
      prevHighestBid &&
      lowestAsk.price === prevLowestAsk!.price &&
      lowestAsk.quantity === prevLowestAsk!.quantity &&
      highestBid.price === prevHighestBid!.price &&
      highestBid.quantity === prevHighestBid!.quantity
    ) {
      return undefined;
    }
    const bboMsg: BboMsg = {
      exchange,
      channel: '',
      pair,
      timestamp: Math.max(lowestAsk.timestamp, highestBid.timestamp),
      raw: '',
      bidPrice: highestBid.price,
      bidQuantity: highestBid.quantity,
      askPrice: lowestAsk.price,
      askQuantity: lowestAsk.quantity,
    };

    return bboMsg;
  }
}
