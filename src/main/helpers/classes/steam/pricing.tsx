import { getValue, setValue } from './settings';

const axios = require('axios');
require('dotenv').config();
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const pricingEmitter = new MyEmitter();

// Get latest prices, if fail use backup

// async function getPricesBackup(cas) {
//   const pricesBackup = require('./backup/prices.json');
//   cas.setPricing(pricesBackup);
// }

async function getPrices(cas) {
  return Promise.all([
    getPrice(cas, 'steam', 'https://prices.csgotrader.app/latest/steam.json'),
    getPrice(
      cas,
      'buff163',
      'https://prices.csgotrader.app/latest/buff163.json'
    ),
    getPrice(
      cas,
      'skinport',
      'https://prices.csgotrader.app/latest/skinport.json'
    ),
  ]);
}

function getPrice(cas, provider, providerUrl) {
  axios
    .get(providerUrl)
    .then(function (response) {
      console.log(
        'prices, response',
        typeof response === 'object',
        response !== null
      );
      if (typeof response === 'object' && response !== null) {
        cas.setPricing(provider, response.data, 'normal');
      } else {
        // getPricesBackup(cas);
      }
    })
    .catch(function (error) {
      console.log('Error prices', error);
      // getPricesBackup(cas);
    });
}

const currencyCodes = {
  1: 'USD',
  2: 'GBP',
  3: 'EUR',
  4: 'CHF',
  5: 'RUB',
  6: 'PLN',
  7: 'BRL',
  8: 'JPY',
  9: 'NOK',
  10: 'IDR',
  11: 'MYR',
  12: 'PHP',
  13: 'SGD',
  14: 'THB',
  15: 'VND',
  16: 'KRW',
  17: 'TRY',
  18: 'UAH',
  19: 'MXN',
  20: 'CAD',
  21: 'AUD',
  22: 'NZD',
  23: 'CNY',
  24: 'INR',
  25: 'CLP',
  26: 'PEN',
  27: 'COP',
  28: 'ZAR',
  29: 'HKD',
  30: 'TWD',
  31: 'SAR',
  32: 'AED',
  33: 'SEK',
  34: 'ARS',
  35: 'ILS',
  36: 'BYN',
  37: 'KZT',
  38: 'KWD',
  39: 'QAR',
  40: 'CRC',
  41: 'UYU',
  42: 'BGN',
  43: 'HRK',
  44: 'CZK',
  45: 'DKK',
  46: 'HUF',
  47: 'RON',
};

const FIRST_PRICING_PROVIDER = 'steam';
// import { DOMParser } from 'xmldom'
// RUN PROGRAMS
class runItems {
  steamUser;
  seenItems;
  packageToSend;
  header;
  currency;
  headers;
  prices;

  constructor(steamUser) {
    this.steamUser = steamUser;
    this.seenItems = {};
    this.packageToSend = {};
    this.prices = {};
    getPrices(this);
    getValue('pricing.currency').then((returnValue) => {
      if (returnValue == undefined) {
        setValue('pricing.currency', currencyCodes[steamUser.wallet.currency]);
      }
    });
  }
  async setPricing(provider, pricingData, commandFrom) {
    console.log('pricingSet', commandFrom);
    this.prices[provider] = pricingData;
  }

  async makeSingleRequest(itemRow) {
    let itemNamePricing = itemRow.item_name.replaceAll(
      '(Holo/Foil)',
      '(Holo-Foil)'
    );
    if (itemRow.item_wear_name !== undefined) {
      itemNamePricing = itemRow.item_name + ' (' + itemRow.item_wear_name + ')';
      if (
        !this.prices[FIRST_PRICING_PROVIDER][itemNamePricing] &&
        this.prices[FIRST_PRICING_PROVIDER][itemRow.item_name]
      ) {
        itemNamePricing = itemRow.item_name;
      }
    }

    if (this.prices[FIRST_PRICING_PROVIDER][itemNamePricing] !== undefined) {
      let pricingDict = {
        steam_listing: this.prices['steam'][itemNamePricing]?.last_90d,
        buff163: this.prices['buff163'][itemNamePricing]?.starting_at?.price,
        skinport: this.prices['skinport'][itemNamePricing]?.starting_at,
        bitskins: 0,
      };
      if (this.prices['steam'][itemNamePricing]?.last_30d) {
        pricingDict.steam_listing =
          this.prices['steam'][itemNamePricing]?.last_30d;
      }
      if (this.prices['steam'][itemNamePricing]?.last_7d) {
        pricingDict.steam_listing =
          this.prices['steam'][itemNamePricing]?.last_7d;
      }

      if (this.prices['steam'][itemNamePricing]?.last_24h) {
        pricingDict.steam_listing =
          this.prices['steam'][itemNamePricing]?.last_24h;
      }
      if (
        this.prices['steam'][itemNamePricing]?.last_7d == 0 &&
        this.prices['buff163'][itemNamePricing]?.starting_at?.price > 2000
      ) {
        pricingDict.steam_listing =
          this.prices[itemNamePricing]?.buff163.starting_at?.price * 0.8;
      }
      itemRow['pricing'] = pricingDict;
      return itemRow;
    } else {
      let pricingDict = {
        buff163: 0,
        steam_listing: 0,
        skinport: 0,
        bitskins: 0,
      };
      itemRow['pricing'] = pricingDict;
      return itemRow;
    }
  }
  async handleItem(itemRow) {
    let returnRows = [] as any;
    itemRow.forEach((element) => {
      if (element.item_name !== undefined && element.item_moveable == true) {
        this.makeSingleRequest(element).then((returnValue) => {
          returnRows.push(returnValue);
        });
      }
    });
    pricingEmitter.emit('result', itemRow);
  }

  async handleTradeUp(itemRow) {
    let returnRows = [] as any;
    itemRow.forEach((element) => {
      this.makeSingleRequest(element).then((returnValue) => {
        returnRows.push(returnValue);
      });
    });
    pricingEmitter.emit('result', itemRow);
  }
}
module.exports = {
  runItems,
  pricingEmitter,
  currencyCodes,
};
export { runItems, pricingEmitter, currencyCodes };
