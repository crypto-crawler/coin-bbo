#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';
import chalk from 'chalk';
import figlet from 'figlet';
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

console.info(chalk.green(figlet.textSync('Coin BBO')));

const { exchange, pair } = argv;

(async () => {
  await crawl(exchange, [pair]);
})();
