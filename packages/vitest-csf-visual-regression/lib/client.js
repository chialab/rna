/* global navigator */
import { vi } from 'vitest';

/**
 * @typedef {import('vitest').VitestUtils} VitestUtils
 */

/**
 * @typedef {Object} GeolocationPosition
 * @property {number} accuracy
 * @property {number | null} altitude
 * @property {number | null} altitudeAccuracy
 * @property {number | null} heading
 * @property {number} latitude
 * @property {number} longitude
 * @property {number | null} speed
 */

/**
 * @typedef {VitestUtils & {
 *   sleep: (ms: number) => Promise<void>,
 *   useFakeRandom: (values?: number[]) => void,
 *   useRealRandom: () => void,
 *   useFakeGeolocation: (position: GeolocationPosition | null) => void,
 *   useRealGeolocation: () => void
 * }} VisualRegressionVitestUtils
 */

const random = Math.random.bind(Math);
const getCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);

/**
 * @type {VisualRegressionVitestUtils}
 */
const _vi = Object.create(vi, {
    sleep: {
        /**
         * Delays execution for a given number of milliseconds.
         * @param {number} ms The number of milliseconds to sleep.
         * @returns {Promise<void>} A promise that resolves after the specified delay.
         */
        value: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
    useFakeRandom: {
        value: (
            values = [
                0.8383582018212816, 0.4479775168911144, 0.4219441154070198, 0.6847194069485607, 0.6974444919153171,
                0.34171906612861735, 0.5820518065892519, 0.674878052783368, 0.9003493635550603, 0.40376808396280484,
                0.5689216929104737, 0.027467482697622003, 0.03679700185430801, 0.7522849808267753, 0.2805152601531904,
                0.6420927211767482, 0.15940329962403998, 0.6645286263380807, 0.3195419102504873, 0.6593654542805516,
                0.4608454168644065, 0.23483274930966735, 0.3286938805856898, 0.4495730526682262, 0.5334239824371338,
                0.3368255708538743, 0.7474310853931565, 0.23219833621393082, 0.4768820992654703, 0.7147655448049413,
                0.8767752855093254, 0.10317722563830722, 0.017956852223777187, 0.5685659123055657, 0.10278434272368964,
                0.40297531194798486, 0.504330156550236, 0.7501466452291319, 0.8349881865209605, 0.45679013487902465,
                0.33062612524783574, 0.4960153543672139, 0.932818861947623, 0.7653198632681586, 0.06778278783002589,
                0.31626969680896266, 0.18471627630887166, 0.2432829448833369, 0.9550932522664588, 0.0947351243955672,
            ]
        ) => {
            let randomIndex = 0;
            Math.random = function () {
                const value = values[randomIndex++];
                if (randomIndex === values.length) {
                    randomIndex = 0;
                }

                return value;
            };
        },
    },
    useRealRandom: {
        value: () => {
            Math.random = random;
        },
    },
    useFakeGeolocation: {
        /**
         * Mocks the Geolocation API to return a fixed position or an error.
         * @param {GeolocationPosition | null} position The position to return, or null to simulate an error.
         */
        value: (position) => {
            navigator.geolocation.getCurrentPosition = function (successCallback, errorCallback) {
                setTimeout(() => {
                    if (position) {
                        successCallback({
                            coords: Object.assign(
                                Object.create({
                                    toJSON() {
                                        return position;
                                    },
                                }),
                                position
                            ),
                            timestamp: Date.now(),
                            toJSON() {
                                return position;
                            },
                        });
                    } else if (errorCallback) {
                        errorCallback({
                            code: 1,
                            message: 'User denied Geolocation',
                            PERMISSION_DENIED: 1,
                            POSITION_UNAVAILABLE: 2,
                            TIMEOUT: 3,
                        });
                    }
                }, 1_000);
            };
        },
    },
    useRealGeolocation: {
        value: () => {
            navigator.geolocation.getCurrentPosition = getCurrentPosition;
        },
    },
});

export { _vi as vi };
