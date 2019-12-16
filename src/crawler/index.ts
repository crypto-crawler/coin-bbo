export const CHANNEL_TYPES = ['BBO', 'FullOrderBook', 'OrderBookUpdate', 'Trade'] as const;
export type ChannelType = typeof CHANNEL_TYPES[number];

export const EXCHANGES = ['Binance', 'Newdex', 'WhaleEx'] as const;
export type SupportedExchange = typeof EXCHANGES[number];
