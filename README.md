# coin-bbo

A crawler to get realtime BBO messages from crypto exchanges.

## How to use

```javascript
const crawl = require('coin-bbo').default; // eslint-disable-line import/no-unresolved

function processMsgCallback(msg) {
  console.info(msg); // eslint-disable-line no-console
}

(async () => {
  await crawl('CoinbasePro', 'Spot', ['BTC_USD'], processMsgCallback);
})();
```

## Quickstart

```bash
npx coin-bbo CoinbasePro --marketType Spot --pairs BTC_USD
```

## Help

```bash
npx coin-bbo --help
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
export default function crawlBbo(
  exchange: string,
  pairs?: string[], // empty means all
  bboMessageCallback?: BboMessageCallback,
): Promise<void>;
```

## Related Projects

- [crypto-order](https://www.npmjs.com/package/crypto-order), a library to place and cancel orders at crypto exchanges.
