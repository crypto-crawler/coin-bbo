import { strict as assert } from 'assert';
import WebSocket from 'ws';
import getExchangeInfo, { ExchangeInfo } from 'exchange-info';
import { listenWebSocket, buildPairMap, getChannels } from '../utils';
import { OrderBookMsg, OrderItem } from '../pojo/msg';
import { BboEmitter, BboMessageCallback } from '../bbo_emitter';

function getChannel(pair: string, exchangeInfo: ExchangeInfo): string {
  const pairInfo = exchangeInfo.pairs[pair];
  const rawPair = pairInfo.raw_pair.toLowerCase();
  return `${rawPair}@depth`;
}

export default async function crawl(
  pairs: string[] = [],
  bboMessageCallback: BboMessageCallback,
): Promise<void> {
  const bboEmitter = new BboEmitter('Binance', bboMessageCallback);
  const exchangeInfo = await getExchangeInfo('Binance');
  // raw_pair -> pairInfo
  const pairMap = buildPairMap(exchangeInfo.pairs);
  // empty means all pairs
  if (pairs.length === 0) {
    pairs = Object.keys(exchangeInfo.pairs); // eslint-disable-line no-param-reassign
  }

  const channels = getChannels(pairs, exchangeInfo, getChannel);
  assert.ok(channels.length > 0);
  const websocketUrl = `${exchangeInfo.websocket_endpoint}/stream?streams=${channels.join('/')}`;
  const websocket = new WebSocket(websocketUrl);
  listenWebSocket(websocket, async data => {
    const rawMsg: { stream: string; data: { [key: string]: any } } = JSON.parse(data as string);

    const rawOrderbookMsg = rawMsg.data as {
      e: string;
      E: number;
      s: string;
      U: number;
      u: number;
      b: Array<Array<string>>;
      a: Array<Array<string>>;
    };
    assert.equal(rawOrderbookMsg.e, 'depthUpdate');
    const msg: OrderBookMsg = {
      exchange: exchangeInfo.name,
      channel: rawMsg.stream,
      pair: pairMap.get(rawOrderbookMsg.s)!.normalized_pair,
      timestamp: rawOrderbookMsg.E,
      raw: data as string,
      asks: [],
      bids: [],
      full: false,
    };
    const parseOrder = (arr: Array<string>): OrderItem => {
      assert.equal(arr.length, 2);
      const orderItem: OrderItem = {
        price: parseFloat(arr[0]),
        quantity: parseFloat(arr[1]),
      };
      return orderItem;
    };
    rawOrderbookMsg.a.forEach((text: Array<string>) => {
      msg.asks.push(parseOrder(text));
    });
    rawOrderbookMsg.b.forEach((text: Array<string>) => {
      msg.bids.push(parseOrder(text));
    });

    await bboEmitter.addOrderBook(msg);
  });
}
