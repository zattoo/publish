const core = require('@actions/core');
const github = require('@actions/github');

// most @actions toolkit packages have async methods
async function run() {
    try {
        const github_token = core.getInput('github_token', {required: true});
        const npm_token = core.getInput('npm_token', {required: true});

        const octokit = new github.GitHub(github_token, {previews: ['flash', 'ant-man']});

        const response = await octokit.request('GET /repos/{owner}/{repo}/package.json', {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
        });

        console.log(response);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
