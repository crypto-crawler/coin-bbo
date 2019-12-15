import { strict as assert } from 'assert';
import { BboMessageCallback } from './bbo_emitter';
import crawlBinance from './crawler/binance';
import { BboMsg } from './pojo/bbo_msg';

async function defaultBboMessageCallback(msg: BboMsg): Promise<Boolean> {
  console.info(msg); // eslint-disable-line no-console
  return true;
}

/**
 * Crawl BBO messages.
 *
 * @param exchange The crypto exchange name
 * @param pairs The pairs to crawl
 * @param bboMessageCallback The function to process BBO messages
 */
export default async function crawl(
  exchange: string,
  pairs: string[] = [],
  bboMessageCallback: BboMessageCallback = defaultBboMessageCallback,
): Promise<void> {
  assert.ok(pairs.length > 0);
  pairs = Array.from(new Set(pairs)); // eslint-disable-line no-param-reassign

  switch (exchange) {
    case 'Binance':
      return crawlBinance(pairs, bboMessageCallback);
    default:
      throw new Error(`Unknown exchange: ${exchange}`);
  }
}

export { BboMsg } from './pojo/bbo_msg';

export { BboMessageCallback } from './bbo_emitter';
