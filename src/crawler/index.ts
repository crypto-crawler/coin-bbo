import { BboMsg } from '../pojo/bbo_msg';

export const EXCHANGES = ['Binance', 'Newdex', 'WhaleEx'] as const;
export type SupportedExchange = typeof EXCHANGES[number];

export type ProcessMessageCallback = (msg: BboMsg) => Promise<Boolean>;
export async function defaultProcessMessageCallback(msg: BboMsg): Promise<Boolean> {
  console.dir(msg); // eslint-disable-line no-console
  return true;
}
