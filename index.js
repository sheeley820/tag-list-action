const core = require('@actions/core');
const github = require('@actions/github');

const main = async () => {
    const owner = core.getInput('owner', { required: true });
    const repo = core.getInput('repo', { required: true });
    const pr_number = core.getInput('pr_number', { required: true });
    const token = core.getInput('token', { required: true });
    const ref = core.getInput('ref', { required: true });

    const pullRequestNumber = parseInt(pr_number, 10);

    const octokit = new github.getOctokit(token);
    let tagsForRepo = [];
    let tagTable = "";

    try {
        const { data: repoTags } = await octokit.rest.repos.listTags({ owner, repo });
        const { data: commits} = await octokit.rest.pulls.listCommits({ owner, repo, pull_number: pullRequestNumber });

        const tagsWithDates = await Promise.all(repoTags.map(async (tag) => {
            const commitData = await octokit.request(`GET /repos/{owner}/{repo}/commits/{commit_sha}`, {
                owner,
                repo,
                commit_sha: tag.commit.sha
            });

            return {
                name: tag.name,
                sha: tag.commit.sha,
                date: commitData.data.commit.author.date
            };
        }));
        tagsWithDates.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        tagsForRepo = tagsWithDates.map((tag) => {
            const tagCommit = commits.find((commit) => commit.sha === tag.sha);
            return {
                ...tag,
                isInPullRequest: !!tagCommit,
                date: tag.date
            };
        });
        tagTable = tagsForRepo.reduce((acc, tag, ind) => {
            if (tag.isInPullRequest) {
                return acc + `| (new) **${tag.name}** | **${tag.date}** |\n`;
            }
            return acc + `| ${tag.name} | ${tag.date} |\n`;
        }, "| Release Tag | Date Tagged |\n|-----|---------------|\n");
    } catch (e) {
        console.error('Error fetching tags for pull request:', e.message);
        throw e;
    }

    async function leaveComment(owner, repo, pullNumber, commentBody) {
        try {
            await octokit.rest.issues.createComment({
                owner: owner,
                repo: repo,
                issue_number: pullNumber,
                body: commentBody
            });
        } catch (error) {
            console.error("Error creating comment: ", error);
        }
    }

    await leaveComment(
        owner,
        repo,
        pullRequestNumber,
        tagTable
    );
}

main();