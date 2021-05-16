import cheerio from 'cheerio';

/**
 * @typedef {import('cheerio').Cheerio<import('cheerio').Document>} Document
 */

const $ = (typeof (/** @type {*} */ (cheerio)).default === 'function') ?
    (/** @type {{ default: typeof cheerio }} */ (/** @type {unknown} */ (cheerio)).default) :
    cheerio;

export default $;
