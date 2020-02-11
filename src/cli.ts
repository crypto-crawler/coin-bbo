#!/usr/bin/env node
/* eslint-disable no-console */
import { EXCHANGES } from 'crypto-crawler/dist/crawler';
import yargs from 'yargs';
import crawl from './index';

const { argv } = yargs
  // eslint-disable-next-line no-shadow
  .command('$0 <exchange> <pair>', 'Get realtime BBO', yargs => {
    yargs
      .positional('exchange', {
        choices: EXCHANGES,
        type: 'string',
        default: 'Coinbase',
        describe: 'The exchange name',
      })
      .positional('pair', {
        type: 'string',
        describe: 'The trading pair',
        default: 'BTC_USD',
      });
  });

const { exchange, pair } = argv;

(async () => {
  await crawl(exchange as string, [pair as string]);
})();
