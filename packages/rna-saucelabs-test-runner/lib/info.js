/**
 * @param {string} name The project name.
 */
export function testName(name) {
    let message = `Tests for ${name}`;

    const branchName = process.env.TRAVIS_BRANCH ||
        process.env.CI_COMMIT_BRANCH ||
        process.env.GITHUB_REF;
    if (branchName) {
        message = `${message} | ${branchName.trim()}`;
    }

    const commit = process.env.TRAVIS_COMMIT_MESSAGE
        || process.env.CI_COMMIT_TITLE;
    if (commit) {
        message = `${message}, ${commit.trim()}`;
    }

    return message;
}

export function testJob() {
    if (process.env.TRAVIS) {
        return `TRAVIS # ${process.env.TRAVIS_BUILD_NUMBER} (${process.env.TRAVIS_BUILD_ID})`;
    }
    if (process.env.GITLAB_CI) {
        return `GITLAB # ${process.env.CI_JOB_NAME} (${process.env.CI_JOB_ID})`;
    }
    if (process.env.GITHUB_ACTIONS) {
        return `GITHUB # ${process.env.GITHUB_RUN_NUMBER} (${process.env.GITHUB_JOB})`;
    }

    return 'local';
}
