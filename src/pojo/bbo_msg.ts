// BBO, best bid and offer
export interface BboMsg {
  exchange: string;
  pair: string; // normalized pair name, upper case, splited by _, e.g., BTC_USDT
  price: number;
  quantity: number;
  side: boolean; // true, ask, sell; false, bid, buy
  timestamp: number; // Unix timestamp, in milliseconds
}
