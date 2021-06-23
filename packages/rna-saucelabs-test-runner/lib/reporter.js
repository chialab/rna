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
     * @type {import('@web/test-runner').Reporter}
     */
    const reporter = {
        start(args) {
            updates = [];
            args.browsers.forEach((browser) => {
                const stop = browser.stop;
                browser.stop = async function() {
                    const driver = (/** @type {*} */ (this)).driver;
                    const sessions = args.sessions.forBrowser(this);

                    let passed = true;
                    for (const session of sessions) {
                        if (session.passed === false) {
                            passed = false;
                        }
                    }
                    await fetch(`https://${user}:${key}@saucelabs.com/rest/v1/${user}/jobs/${driver.sessionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }, JSON.stringify({
                        passed,
                    }));

                    if (stop) {
                        return stop.call(this);
                    }
                };
            });
        },

        async stop() {
            await Promise.all(updates);
        },
    };

    return reporter;
}
