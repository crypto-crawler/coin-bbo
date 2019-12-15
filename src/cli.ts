#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';
import { EXCHANGES } from './bbo_emitter';

import crawl from './index';

const { argv } = yargs.options({
  exchange: {
    choices: EXCHANGES,
    type: 'string',
    demandOption: true,
    default: 'Newdex',
  },
  pair: {
    type: 'string',
    demandOption: true,
    default: 'EIDOS_EOS',
  },
});

const { exchange, pair } = argv;

(async () => {
  await crawl(exchange, [pair]);
})();
