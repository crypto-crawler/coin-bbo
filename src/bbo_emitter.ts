import { strict as assert } from 'assert';
import { BboMsg, Msg, OrderBookMsg, OrderItem } from 'crypto-crawler';
import { MarketType } from 'crypto-markets';
import { AskQueue, BidQueue, Order } from './pojo/order_queue';
import debug from './utils';

export type BboMessageCallback = (msg: BboMsg) => Promise<void>;

export class BboEmitter {
  private static TIMEOUT = 1000 * 60 * 30; // 30 min

  private static MAX_SIZE = 10;

  private pairBbo: { [key: string]: { lowestAsks: AskQueue; highestBids: BidQueue } } = {};

  private exchange: string;

  private marketType: MarketType;

  private bboMsgCallBack: BboMessageCallback;

  constructor(exchange: string, marketType: MarketType, bboMsgCallBack: BboMessageCallback) {
    this.exchange = exchange;
    this.marketType = marketType;
    this.bboMsgCallBack = bboMsgCallBack;
  }

  public async addMsg(msg: Msg): Promise<void> {
    switch (msg.channelType) {
      case 'OrderBook':
        this.addOrderBook(msg as OrderBookMsg);
        break;
      case 'BBO':
        this.addBboMsg(msg as BboMsg);
        break;
      default:
        throw new Error(`Unknown channelType ${msg.channelType}`);
    }
  }

  private async addOrderBook(orderBookMsg: OrderBookMsg): Promise<void> {
    assert.equal(orderBookMsg.exchange, this.exchange);
    assert.equal(orderBookMsg.marketType, this.marketType);
    this.init(orderBookMsg.pair);
    const prevLowestAsk = this.pairBbo[orderBookMsg.pair].lowestAsks.peek();
    const prevHighestBid = this.pairBbo[orderBookMsg.pair].highestBids.peek();

    if (orderBookMsg.full) {
      if (orderBookMsg.bids.length <= 0 || orderBookMsg.asks.length <= 0) return;

      const msg: BboMsg = {
        exchange: orderBookMsg.exchange,
        marketType: orderBookMsg.marketType,
        pair: orderBookMsg.pair,
        rawPair: orderBookMsg.rawPair,
        channel: orderBookMsg.channel,
        channelType: 'BBO',
        timestamp: orderBookMsg.timestamp,
        raw: orderBookMsg.raw,
        bidPrice: orderBookMsg.bids[0].price,
        bidQuantity: orderBookMsg.bids[0].quantity,
        askPrice: orderBookMsg.asks[0].price,
        askQuantity: orderBookMsg.asks[0].quantity,
      };

      this.addBboMsg(msg);
      return;
    }

    const createOrder = (orderItem: OrderItem): Order => ({
      price: orderItem.price,
      quantity: orderItem.quantity,
      timestamp: orderBookMsg.timestamp,
    });

    orderBookMsg.asks.forEach((orderItem) => {
      const order = createOrder(orderItem);
      this.addOrder(order, orderBookMsg.pair, true);
    });
    orderBookMsg.bids.forEach((orderItem) => {
      const order = createOrder(orderItem);
      this.addOrder(order, orderBookMsg.pair, false);
    });

    const curLowestAsk = this.pairBbo[orderBookMsg.pair].lowestAsks.peek();
    const curHighestBid = this.pairBbo[orderBookMsg.pair].highestBids.peek();

    const result = BboEmitter.emitBboMsg(
      this.exchange,
      this.marketType,
      orderBookMsg.pair,
      orderBookMsg.rawPair,
      orderBookMsg.channel,
      prevLowestAsk,
      prevHighestBid,
      curLowestAsk,
      curHighestBid,
    );

    if (result) this.bboMsgCallBack(result);
  }

  private async addBboMsg(bboMsg: BboMsg): Promise<void> {
    assert.equal(bboMsg.exchange, this.exchange);
    assert.equal(bboMsg.marketType, this.marketType);
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

    const curLowestAsk = this.pairBbo[bboMsg.pair].lowestAsks.peek()!;
    const curHighestBid = this.pairBbo[bboMsg.pair].highestBids.peek()!;

    // No change
    if (
      prevLowestAsk &&
      prevHighestBid &&
      curLowestAsk.price === prevLowestAsk!.price &&
      curLowestAsk.quantity === prevLowestAsk!.quantity &&
      curHighestBid.price === prevHighestBid!.price &&
      curHighestBid.quantity === prevHighestBid!.quantity
    ) {
      return;
    }

    this.bboMsgCallBack(bboMsg);
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
  private addOrder(order: Order, pair: string, side: boolean): void {
    if (order.price <= 0) {
      debug(`price is less than 0, pair: ${pair}, side: ${side ? 'sell' : 'buy'}, order: ${order}`);
      return;
    }
    assert.ok(order.timestamp);

    const queue = side ? this.pairBbo[pair].lowestAsks : this.pairBbo[pair].highestBids;

    // quantity 0 means delete
    if (order.quantity === 0) {
      queue.removeAll(order.price);
      return;
    }

    const prevTop = queue.peek();
    // queue is empty
    if (prevTop === undefined) {
      queue.add(order);
      //  this.emitBboMsg(order, pair, side);
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
          //  this.emitBboMsg(order, pair, side);
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
    marketType: MarketType,
    pair: string,
    rawPair: string,
    channel: string,
    prevLowestAsk: Order | undefined,
    prevHighestBid: Order | undefined,
    curLowestAsk: Order | undefined,
    curHighestBid: Order | undefined,
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

    if (!changed) return undefined;

    let lowestAsk: Order = curLowestAsk;
    if (prevLowestAsk !== undefined && prevLowestAsk!.price < curLowestAsk!.price) {
      lowestAsk = prevLowestAsk;
    }

    let highestBid: Order = curHighestBid;
    if (prevHighestBid !== undefined && prevHighestBid!.price > curHighestBid!.price) {
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
      marketType,
      pair,
      rawPair,
      channel,
      channelType: 'BBO',
      timestamp: Math.max(lowestAsk.timestamp, highestBid.timestamp),
      raw: {},
      bidPrice: highestBid.price,
      bidQuantity: highestBid.quantity,
      askPrice: lowestAsk.price,
      askQuantity: lowestAsk.quantity,
    };

    return bboMsg;
  }
}
