export interface Msg {
  exchange: string;
  channel: string; // original websocket channel
  pair: string; // normalized pair name, upper case, splited by /, e.g., BTC/USDT
  timestamp: number; // Unix timestamp, in milliseconds
  raw: string; // the original message
}

export interface OrderItem {
  price: number;
  quantity: number;
}

export interface OrderBookMsg extends Msg {
  asks: Array<OrderItem>; // sorted from smallest to largest
  bids: Array<OrderItem>; // sorted from largest to smallest
  full: boolean;
}
