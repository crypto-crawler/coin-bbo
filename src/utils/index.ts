import WebSocket from 'ws';
import { ExchangeInfo, PairInfo } from 'exchange-info';

// eslint-disable-next-line import/prefer-default-export
export async function listenWebSocket(
  websocket: WebSocket,
  handleData: (data: WebSocket.Data) => void,
): Promise<void> {
  websocket.on('message', handleData);
  websocket.on('open', () => {
    console.info(`${websocket.url} connected`); // eslint-disable-line no-console
  });
  websocket.on('error', error => {
    console.error(JSON.stringify(error)); // eslint-disable-line no-console
    process.exit(1); // fail fast, pm2 will restart it
  });
  websocket.on('close', () => {
    console.info(`${websocket.url} disconnected`); // eslint-disable-line no-console
    process.exit(); // pm2 will restart it
  });
}

export function buildPairMap(pairs: { [key: string]: PairInfo }): Map<string, PairInfo> {
  const result = new Map<string, PairInfo>();
  Object.keys(pairs).forEach(p => {
    const pairInfo = pairs[p];
    result.set(pairInfo.raw_pair, pairInfo);
  });
  return result;
}

export function getChannels(
  pairs: string[],
  exchangeInfo: ExchangeInfo,
  getChannel: (pair: string, exchangeInfo: ExchangeInfo) => string,
): string[] {
  const channels: string[] = [];
  pairs.forEach(pair => {
    const channel = getChannel(pair, exchangeInfo);
    channels.push(channel);
  });

  return channels;
}
