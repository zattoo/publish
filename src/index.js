const fse = require('fs-extra');
const {glob} = require('glob');
const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const {
    getBody,
    fetchNPMVersions
} = require('./utils');

async function run() {
    try {
        const github_token = core.getInput('github_token', {required: true});
        const npm_token = core.getInput('npm_token');
        const sources = core.getInput('sources');
        const notesPath = core.getInput('notes');

        const octokit = github.getOctokit(github_token);

        const isSingle = !sources;

        const sourcePaths = isSingle ? [''] : glob.sync(sources);

        for await (const sourcePath of sourcePaths) {
            const path = `./${sourcePath}`;

            if (!fse.lstatSync(path).isDirectory()) {
                continue;
            }

            const pathToPackage = `${path}/package.json`;

            const pkg = /** @type {Package} */(await fse.readJSON(pathToPackage));

            if (!pkg) {
                throw Error(`${pathToPackage} is missing`);
            }

            const name = pkg.name;

            if (!name) {
                throw Error(`Name in ${pathToPackage} is missing`);
            }

            const version = pkg.version;

            if (!version) {
                throw Error(`Version in ${pathToPackage} is missing`);
            }

            const tag = isSingle
                ? version // for ex. '1.2.3', '3.2020.0'
                : `${version}-${name.replace('@zattoo/', '')}` // for ex. '3.2020.0-app', '3.17.2-zapi'

            core.info(`\nChecking ${tag}`);

            const owner = github.context.repo.owner;
            const repo = github.context.repo.repo;

            let tagResponse = {data: {}};

            try {
                tagResponse = await octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}', {
                    owner,
                    repo,
                    tag,
                });
            } catch {
            } // tag not found

            // @ts-expect-error tag_name is not part of the initialization object
            const canRelease = !tagResponse.data.tag_name;

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

            if (npm_token) {
                let canPublish;

                try {
                    const npmVersions = await fetchNPMVersions(name, npm_token);
                    canPublish = !npmVersions.includes(version); // new version
                } catch {
                    canPublish = true; // new package
                }

                if (canPublish) {
                    await exec.exec(`npm publish ${path}`);
                    core.info(`Published to npm registry: https://www.npmjs.com/package/${name}`);
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
