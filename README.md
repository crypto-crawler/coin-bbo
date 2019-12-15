# coin-bbo

A crawler to get realtime BBO from crypto exchanges.

## How to use

```javascript
const crawl = require('crypto-bbo').default; // eslint-disable-line import/no-unresolved

function processMsgCallback(msg) {
  console.info(msg); // eslint-disable-line no-console
}

(async () => {
  await crawl('Binance', ['BTC_USDT'], processMsgCallback);
})();
```

## Quickstart

```bash
npx crypto-bbo --exchange Binance --pair BTC_USDT
```

## Help

```bash
npx crypto-bbo --help
```

## API Manual

There is only one API in this library:

```typescript
/**
 * Crawl BBO messages.
 *
 * @param exchange The crypto exchange name
 * @param pairs The pairs to crawl
 * @param bboMessageCallback The function to process BBO messages
 */
export default function crawl(
  exchange: string,
  pairs?: string[],
  bboMessageCallback?: BboMessageCallback,
): Promise<void>;
```

## Related Projects

- [crypto-order](https://www.npmjs.com/package/crypto-order), a library to place and cancel orders at crypto exchanges.
