#!/usr/bin/env node
/* eslint-disable no-console */
import { SUPPORTED_EXCHANGES } from 'crypto-crawler';
import { MarketType, MARKET_TYPES } from 'crypto-markets';
import yargs from 'yargs';
import crawl from './index';

const { argv } = yargs
  // eslint-disable-next-line no-shadow
  .command('$0 <exchange> [marketType] [pairs]', 'Get realtime BBO', (yargs) => {
    yargs
      .positional('exchange', {
        choices: SUPPORTED_EXCHANGES,
        type: 'string',
        default: 'Coinbase',
        describe: 'The exchange name',
      })
      .options({
        marketType: {
          choices: MARKET_TYPES,
          type: 'string',
          default: 'Spot',
        },
        pairs: {
          type: 'array',
          describe: 'Trading pairs to crawl',
          demandOption: true,
          default: ['BTC_USDT', 'ETH_USDT'],
        },
      });
  });

const { exchange, marketType, pairs } = argv;

crawl(exchange as string, marketType as MarketType, pairs as string[]);
