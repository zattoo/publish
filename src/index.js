const fsp = require('node:fs/promises');
const assert = require('node:assert');

const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const {glob} = require('glob');

const {
    getBody,
    fetchVersions,
} = require('./utils');

async function run() {
    try {
        const github_token = core.getInput('github_token', {required: true});
        const publish_package = core.getBooleanInput('publish_package');
        const sources = core.getInput('sources');
        const notesPath = core.getInput('notes');

        const octokit = github.getOctokit(github_token);

        const isSingle = !sources;

        const sourcePaths = isSingle ? [''] : glob.sync(sources);

        for await (const sourcePath of sourcePaths) {
            const path = `./${sourcePath}`;
            const stats = await fsp.lstat(path);

            if (!stats.isDirectory()) {
                continue;
            }

            const pathToPackage = `${path}/package.json`;
            const rawPkg = await fsp.readFile(pathToPackage, 'utf8');

            /** @type {Package} */
            const pkg = JSON.parse(rawPkg);
            const {name, version} = pkg;

            assert.ok(name, `Name in ${pathToPackage} is missing`);
            assert.ok(version, `Version in ${pathToPackage} is missing`);

            const tag = isSingle
                ? version // for ex. '1.2.3', '3.2020.0'
                : `${version}-${name.replace('@zattoo/', '')}` // for ex. '3.2020.0-app', '3.17.2-zapi'

            core.info(`\nChecking ${tag}`);

            const owner = github.context.repo.owner;
            const repo = github.context.repo.repo;

            let canRelease = true;

            try {
                let tagResponse = await octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}', {
                    owner,
                    repo,
                    tag,
                });

                canRelease = !tagResponse.data.tag_name;
            } catch {} // tag not found

            if (canRelease) {
                const body = await getBody(`${path}/CHANGELOG.md`, notesPath);

                await octokit.request('POST /repos/{owner}/{repo}/releases', {
                    owner,
                    repo,
                    target_commitish: github.context.ref.split('refs/heads/')[1],
                    tag_name: tag,
                    name: tag,
                    body,
                    prerelease: !!version.match(/alpha|beta|rc/),
                });

                core.info(`Release notes created: https://github.com/${owner}/${repo}/releases/tag/${tag}`);
            } else {
                core.info('Release is already exist. Nothing to do here');
            }

            if (publish_package) {
                let canPublish = false;

                try {
                    const versions = await fetchVersions(name);

                    canPublish = !versions.includes(version); // new version
                } catch {
                    canPublish = true; // new package
                }

                if (canPublish) {
                    await exec.exec(`npm publish ${path}`);
                    core.info(`Published package "${name}@${version}"`);
                } else {
                    core.info('Package is already exist. Nothing to do here');
                }
            }
        }
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : 'Unknown error');
    }
}

run();

/**
 * @typedef {object} Package
 * @prop {string} name
 * @prop {string} version
 */
