const util = require('node:util');
const {glob} = require('glob');
const fse = require('fs-extra');
const core = require('@actions/core');
const changelogParser = require('changelog-parser');

const parseChangelog = util.promisify(changelogParser);

/**
 * @param {string} packageName
 * @param {string} token
 */
const fetchNPMVersions = async (packageName, token) => {
    const url = `https://registry.npmjs.org/${packageName}`;
    const headers = {'Authorization': `Bearer ${token}`};

    try {
        const response = await fetch(url, {headers});
        const data = /** @type {Package} */ (await response.json());

        return Object.values(data.versions).map(({ version }) => version);
    } catch (error) {
        console.error(`Failed to fetch NPM versions for ${packageName}:`, error);
        throw error;
    }
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
                const fileContent = await fse.readFile(filePath, {encoding: 'utf-8'});
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

    const changelog = await parseChangelog(changelogPath);
    return changelog.versions[0].body;
};

module.exports = {
    fetchNPMVersions,
    getBody,
}

/**
 * @typedef {object} VersionObj
 * @prop {string} version
 */

/**
 * @typedef {object} Package
 * @prop {Record<string, VersionObj>} versions
 */
