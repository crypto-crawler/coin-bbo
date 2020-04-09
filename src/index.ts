import crawl, { BboMsg, Msg, OrderBookMsg } from 'crypto-crawler';
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

  switch (exchange) {
    case 'Bitfinex':
      return crawl(exchange, marketType, ['BBO'], pairs, (msg: Msg) =>
        bboEmitters[exchange].addOrderBook(msg as OrderBookMsg),
      );
    case 'Binance':
    case 'Huobi':
    case 'Kraken':
      return crawl(exchange, marketType, ['BBO'], pairs, (msg: Msg) =>
        bboEmitters[exchange].addBboMsg(msg as BboMsg),
      );
    case 'Bitstamp':
    case 'MXC':
    case 'CoinbasePro':
    case 'Newdex':
    case 'OKEx':
    case 'WhaleEx':
      return crawl(exchange, marketType, ['OrderBook'], pairs, (msg: Msg) =>
        bboEmitters[exchange].addOrderBook(msg as OrderBookMsg),
      );
    default:
      throw new Error(`Unknown exchange: ${exchange}`);
  }
}

export { BboMsg } from 'crypto-crawler';
export { BboMessageCallback } from './bbo_emitter';
