import { readFile } from 'fs/promises';
import _ from 'lodash';

/**
 * @param {string} filePath
 * @param {*} data
 */
async function template(filePath, data) {
    const content = await readFile(filePath, 'utf-8');
    return _.template(content)(data);
}

/**
 * @param {*} data
 * @param {string} [file]
 */
export function indexHtml(data, file = new URL('../static/index.html', import.meta.url).pathname) {
    return template(file, data);
}

/**
 * @param {*} data
 * @param {string} [file]
 */
export function iframeHtml(data, file = new URL('../static/iframe.html', import.meta.url).pathname) {
    return template(file, data);
}

/**
 * @param {string} [file]
 */
export function managerCss(file = new URL('../static/manager.css', import.meta.url).pathname) {
    return readFile(file, 'utf-8');
}

/**
 * @param {string} [file]
 */
export function previewCss(file = new URL('../static/preview.css', import.meta.url).pathname) {
    return readFile(file, 'utf-8');
}
