const util = require('node:util');
const {glob} = require('glob');
const fse = require('fs-extra');
const core = require('@actions/core');
const npmFetch = require('npm-registry-fetch');
const changelogParser = require('changelog-parser');

const parseChangelog = util.promisify(changelogParser);

/**
 * @param {string} packageName
 * @param {string} token
 */
const fetchNPMVersions = async (packageName, token) => {
    const response = /** @type {Package} */(await npmFetch.json(
        `https://registry.npmjs.org/@zattoo/zapi`,
        {token},
    ));

    console.log('response', response);

    return Object.values(response.versions).map(({version}) => version);
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
