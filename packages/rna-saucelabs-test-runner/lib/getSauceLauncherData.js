/**
 * @param {string} browser
 */
export function getSauceCapabilities(browser) {
    const chunks = browser.split(' ');
    const browserVersion = /** @type {string} */ (chunks.pop());
    const majorVersion = parseInt(browserVersion.split('.')[0]);

    const browserName = chunks.join(' ').toLowerCase();

    /**
     * @type {*}
     */
    const config = {
        browserVersion,
        browserName,
    };
    switch (browserName) {
        case 'ie':
        case 'internet explorer':{
            config.browserName = 'internet explorer';
            config.platformName = 'Windows 10';
            break;
        }
        case 'edge':
        case 'ms edge':
        case 'microsoftedge':
        case 'microsoft edge': {
            config.browserName = 'MicrosoftEdge';
            config.platformName = 'Windows 10';
            break;
        }
        case 'chrome':
        case 'google chrome':
        case 'chromium': {
            config.browserName = 'chrome';
            if (majorVersion < 75) {
                delete config.browserVersion;
                config.version = browserVersion;
                config.platform = 'Windows 10';
            } else {
                config.platformName = 'Windows 10';
            }
            break;
        }
        case 'firefox':
        case 'ff': {
            config.browserName = 'firefox';
            config.platformName = 'Windows 10';
            break;
        }
        case 'safari': {
            if (majorVersion < 11) {
                delete config.browserVersion;
                config.version = browserVersion;
            }
            break;
        }
        case 'ios':
        case 'iphone':
        case 'ios_safari': {
            delete config.browserVersion;
            config.browserName = 'Safari';
            config.platformName = 'iOS';
            config.version = browserVersion;
            config.platformVersion = browserVersion;
            config.deviceName = 'iPhone Simulator';
            break;
        }
        case 'and_chr':
        case 'and_uc':
        case 'samsung':
        case 'android': {
            delete config.browserVersion;
            if (majorVersion > 5) {
                config.browserName = 'Chrome';
            } else {
                config.browserName = 'Browser';
            }
            config.platformName = 'Android';
            config.version = browserVersion;
            config.platformVersion = browserVersion;
            config.deviceName = 'Android GoogleAPI Emulator';
            break;
        }
    }

    return config;
}
