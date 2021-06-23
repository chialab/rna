import { request } from 'https';

/**
 * @param {string} url
 * @param {import('https').RequestOptions} options
 * @param {*} data
 * @return {Promise<string>}
 */
function fetch(url, options, data) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = request({
            ...options,
            auth: parsed.username ? `${parsed.username}:${parsed.password}` : null,
            hostname: parsed.hostname,
            path: parsed.pathname,
        }, (res) => {
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                resolve(rawData);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(data);
        }

        req.end();
    });
}

/**
 * @param {{ user: string, key: string }} config
 * @returns
 */
export function sauceReporter({ user, key }) {
    /**
     * @type {Promise<any>[]}
     */
    let updates = [];

    /**
     * @type {WeakMap<object, string>}
     */
    let map = new WeakMap();

    /**
     * @type {import('@web/test-runner').Reporter}
     */
    const reporter = {
        start(args) {
            updates = [];
            args.browsers.forEach((browser) => {
                Object.defineProperty(browser, 'driver', {
                    get() {
                        return this._driver;
                    },
                    set(driver) {
                        this._driver = driver;
                        map.set(this, driver.sessionId);
                    },
                });
            });
        },

        onTestRunFinished(args) {
            updates.push(...args.sessions.map((session) =>
                fetch(`https://${user}:${key}@saucelabs.com/rest/v1/${user}/jobs/${map.get(session.browser)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }, JSON.stringify({
                    passed: session.passed,
                }))
            ));
        },

        async stop() {
            await Promise.all(updates);
        },
    };

    return reporter;
}
