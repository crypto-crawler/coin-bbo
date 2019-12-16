import { strict as assert } from 'assert';
import WebSocket from 'ws';
import getExchangeInfo, { ExchangeInfo } from 'exchange-info';
import { listenWebSocket, buildPairMap } from '../utils';
import { OrderBookMsg, OrderItem, BookTickerMsg } from '../pojo/msg';
import { BboEmitter, BboMessageCallback } from '../bbo_emitter';
import { ChannelType } from './index';

function getChannel(channeltype: ChannelType, pair: string, exchangeInfo: ExchangeInfo): string {
  const pairInfo = exchangeInfo.pairs[pair];
  const rawPair = pairInfo.raw_pair.toLowerCase();
  switch (channeltype) {
    case 'BBO':
      return `${rawPair}@bookTicker`;
    case 'OrderBookUpdate':
      return `${rawPair}@depth`;
    case 'Trade':
      return `${rawPair}@trade`;
    default:
      throw Error(`ChannelType ${channeltype} is not supported for Binance yet`);
  }
}

function getChannelType(channel: string): ChannelType {
  assert.ok(channel.includes('@'));
  const suffix = channel.split('@')[1];
  let result: ChannelType;
  switch (suffix) {
    case 'bookTicker':
      result = 'BBO';
      break;
    case 'depth':
      result = 'OrderBookUpdate';
      break;
    case 'trade':
      result = 'Trade';
      break;
    default:
      throw Error(`Unknown channel: ${channel}`);
  }
  return result;
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

  const channels = pairs.map(p => getChannel('BBO', p, exchangeInfo));
  assert.ok(channels.length > 0);
  const websocketUrl = `${exchangeInfo.websocket_endpoint}/stream?streams=${channels.join('/')}`;
  const websocket = new WebSocket(websocketUrl);
  listenWebSocket(websocket, async data => {
    const rawMsg: { stream: string; data: { [key: string]: any } } = JSON.parse(data as string);
    const channelType = getChannelType(rawMsg.stream);
    switch (channelType) {
      case 'BBO': {
        const rawBookTickerMsg = rawMsg.data as {
          u: number; // order book updateId
          s: string; // symbol
          b: string; // best bid price
          B: string; // best bid qty
          a: string; // best ask price
          A: string; // best ask qty
        };
        const msg: BookTickerMsg = {
          exchange: exchangeInfo.name,
          channel: rawMsg.stream,
          pair: pairMap.get(rawBookTickerMsg.s)!.normalized_pair,
          timestamp: Date.now(),
          raw: data as string,
          bidPrice: parseFloat(rawBookTickerMsg.b),
          bidQuantity: parseFloat(rawBookTickerMsg.B),
          askPrice: parseFloat(rawBookTickerMsg.a),
          askQuantity: parseFloat(rawBookTickerMsg.A),
        };
        await bboEmitter.addBookTicker(msg);
        break;
      }
      case 'OrderBookUpdate': {
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
        break;
      }
      default:
        console.warn(`Unrecognized CrawlType: ${channelType}`); // eslint-disable-line no-console
        console.warn(rawMsg); // eslint-disable-line no-console
    }
  });
}
