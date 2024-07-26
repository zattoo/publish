const fsp = require('node:fs/promises');
const util = require('node:util');
const exec = require('node:child_process').exec;

const {glob} = require('glob');
const core = require('@actions/core');
const changelogParser = require('changelog-parser');

const execPromise = util.promisify(exec);

/**
 * @param {string} packageName
 * @returns {Promise<string[]>}
 */
const fetchVersions = async (packageName) => {
    const {stdout} = await execPromise(`npm view ${packageName} versions --json`);
    const versions = JSON.parse(stdout);

    return typeof versions === 'string' ? [versions] : versions;
};

/**
 * @param {string} changelogPath
 * @param {string} [notesPath]
 * @returns {Promise<string>}
 */
const getBody = async (changelogPath, notesPath) => {
    if (notesPath) {
        core.info(`Notes Path found: ${notesPath}`);

        try {
            /** @type {string[]} */
            const outputContent = [];
            const filePaths = await glob(`${notesPath}/*.md`);

            core.debug(JSON.stringify(filePaths));

            await Promise.all(filePaths.map(async (filePath) => {
                const fileContent = await fsp.readFile(filePath, 'utf8');
                if (fileContent) {
                    outputContent.push(fileContent.trim());
                }
            }));

            core.debug(JSON.stringify(outputContent));

            return outputContent.join('\n');
        } catch (e) {
            core.info('Failed Finding Release Notes');
            core.error(e instanceof Error ? e.message : 'Unknown error');
        }
    }

    const changelog = await changelogParser(changelogPath);
    const [lastVersion] = changelog.versions;

    if (!lastVersion) {
        throw new Error('Failed to retrieve changelog.');
    }

    return lastVersion.body;
};

module.exports = {
    fetchVersions,
    getBody,
};

/**
 * @typedef {object} VersionObj
 * @prop {string} version
 */

/**
 * @typedef {object} Package
 * @prop {Record<string, VersionObj>} versions
 */
