import { strict as assert } from 'assert';
import crawl, { BboMsg, Msg } from 'crypto-crawler';
import { MarketType } from 'crypto-markets';
import { BboEmitter, BboMessageCallback } from './bbo_emitter';

async function defaultBboMessageCallback(msg: BboMsg): Promise<void> {
  console.info(msg); // eslint-disable-line no-console
}

/**
 * Crawl BBO messages.
 *
 * @param exchange The crypto exchange name
 * @param marketType Market type, e.g., Spot, Futures
 * @param pairs The pairs to crawl
 * @param bboMessageCallback The function to process BBO messages
 */
export default async function crawlBbo(
  exchange: string,
  marketType: MarketType,
  pairs: readonly string[],
  bboMessageCallback: BboMessageCallback = defaultBboMessageCallback,
): Promise<void> {
  if (pairs.length > 0) {
    pairs = Array.from(new Set(pairs)); // eslint-disable-line no-param-reassign
  }

  const bboEmitters: { [key: string]: BboEmitter } = {};
  if (!(exchange in bboEmitters)) {
    bboEmitters[exchange] = new BboEmitter(exchange, marketType, bboMessageCallback);
  }

  const channelNameMap: { [key: string]: 'BBO' | 'OrderBook' } = {
    Binance: 'BBO',
    Bitfinex: 'BBO',
    Bitstamp: 'OrderBook',
    CoinbasePro: 'OrderBook',
    Huobi: 'BBO',
    Kraken: 'BBO',
    MXC: 'OrderBook',
    Newdex: 'OrderBook',
    OKEx: 'BBO',
    WhaleEx: 'OrderBook',
  };

  assert.ok(channelNameMap[exchange], `Unknown exchange: ${exchange}`);

  crawl(exchange, marketType, [channelNameMap[exchange]], pairs, (msg: Msg) =>
    bboEmitters[exchange].addMsg(msg),
  );
}

export { BboMsg } from 'crypto-crawler';
export { BboMessageCallback } from './bbo_emitter';
