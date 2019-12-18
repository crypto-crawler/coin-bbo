import crawl, { Msg, BboMsg, OrderBookMsg } from 'crypto-crawler';
import { SupportedExchange } from 'crypto-crawler/dist/crawler';
import { BboMessageCallback, BboEmitter } from './bbo_emitter';

async function defaultBboMessageCallback(msg: BboMsg): Promise<void> {
  console.info(msg); // eslint-disable-line no-console
}

/**
 * Crawl BBO messages.
 *
 * @param exchange The crypto exchange name
 * @param pairs The pairs to crawl
 * @param bboMessageCallback The function to process BBO messages
 */
export default async function crawlBbo(
  exchange: string,
  pairs: string[] = [], // empty means all
  bboMessageCallback: BboMessageCallback = defaultBboMessageCallback,
): Promise<void> {
  if (pairs.length > 0) {
    pairs = Array.from(new Set(pairs)); // eslint-disable-line no-param-reassign
  }

  const bboEmitters: { [key: string]: BboEmitter } = {};
  if (!(exchange in bboEmitters)) {
    bboEmitters[exchange] = new BboEmitter(exchange as SupportedExchange, bboMessageCallback);
  }

  switch (exchange) {
    case 'Binance':
    case 'Huobi':
    case 'Kraken':
    case 'OKEx_Spot':
      return crawl(exchange, ['BBO'], pairs, (msg: Msg) =>
        bboEmitters[exchange].addBboMsg(msg as BboMsg),
      );
    case 'Bitstamp':
      return crawl(exchange, ['OrderBookUpdate'], pairs, (msg: Msg) =>
        bboEmitters[exchange].addOrderBook(msg as OrderBookMsg),
      );
    case 'Coinbase':
    case 'Newdex':
      return crawl(exchange, ['OrderBook'], pairs, (msg: Msg) =>
        bboEmitters[exchange].addOrderBook(msg as OrderBookMsg),
      );
    case 'WhaleEx':
      return crawl(exchange, ['FullOrderBook'], pairs, (msg: Msg) =>
        bboEmitters[exchange].addOrderBook(msg as OrderBookMsg),
      );
    default:
      throw new Error(`Unknown exchange: ${exchange}`);
  }
}

export { BboMessageCallback } from './bbo_emitter';
export { BboMsg } from 'crypto-crawler';
