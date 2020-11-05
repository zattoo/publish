const util = require('util');
const fse = require('fs-extra');
const glob = require('glob');
const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const changelogParser = require('changelog-parser');
const npmFetch = require('npm-registry-fetch');

const fetchNPMVersions = (packageName, token) => {
    return npmFetch.json(
        `http://registry.npmjs.org/${packageName}`,
        {token},
    ).then(({versions}) => Object.values(versions).map(({version}) => version));
};

const parseChangelog = util.promisify(changelogParser);

async function run() {
    try {
        const npm_token = core.getInput('npm_token', {required: true});
        const github_token = core.getInput('github_token', {required: true});
        const sources = core.getInput('sources');
        const octokit = github.getOctokit(github_token);

        const isSingle = !sources;

        const sourcePaths = isSingle ? [''] : glob.sync(sources);

        for await (const sourcePath of sourcePaths) {
            const path = `./${sourcePath}`;
            const pathToPackage = `${path}/package.json`;

            const pkg = await fse.readJSON(pathToPackage);

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

            // release notes
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

            const canRelease = !tagResponse.data.tag_name;

            if (canRelease) {
                let canPublish;

                if (npm_token) {
                    try {
                        const npmVersions = await fetchNPMVersions(name, npm_token);
                        canPublish = !npmVersions.includes(version); // new version
                    } catch {
                        canPublish = true; // new package
                    }
                }

                if (canPublish) {
                    await exec.exec(`npm publish ${path}`);
                    core.info(`Published to npm registry: https://www.npmjs.com/package/${name}`);

                    const changelog = await parseChangelog(`${path}/CHANGELOG.md`);

                    const entry = changelog.versions[0];

                    await octokit.request('POST /repos/{owner}/{repo}/releases', {
                        owner,
                        repo,
                        target_commitish: github.context.ref.split('refs/heads/')[1],
                        tag_name: tag,
                        name: tag,
                        body: entry.body,
                        prerelease: !!version.match(/alpha|beta|rc/),
                    });

                    core.info(`Release notes created: https://github.com/${owner}/${repo}/releases/tag/${tag}`);
                } else {
                    core.info('Package is already exist. Nothing to do here');
                }
            } else {
                core.info('Release is already exist. Nothing to do here');
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
