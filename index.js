const core = require('@actions/core');
const { context, getOctokit } = require('@actions/github');
const dateOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
}

const main = async () => {
    const owner = core.getInput('owner') || context.repo.owner;
    const repo = core.getInput('repo') || context.payload.repository?.name;
    const pr_number = context.payload.number;
    const token = process.env.GITHUB_TOKEN;

    const pullRequestNumber = parseInt(pr_number, 10);

    const octokit = new getOctokit(token);
    let tagsForRepo = [];
    let newTagTable = "";
    let existingTagTable = "";

    try {
        const { data: repoTags } = await octokit.rest.repos.listTags({ owner, repo, per_page: 20 });
        const { data: commits} = await octokit.rest.pulls.listCommits({ owner, repo, pull_number: pullRequestNumber });

        const tagsWithDates = await Promise.all(repoTags.map(async (tag) => {
            const commitData = await octokit.request(`GET /repos/{owner}/{repo}/commits/{commit_sha}`, {
                owner,
                repo,
                commit_sha: tag.commit.sha
            });
            const date = new Date(commitData.data.commit.author.date).toLocaleString("en-US", dateOptions);

            return {
                name: tag.name,
                sha: tag.commit.sha,
                date
            };
        }));
        tagsWithDates.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        tagsForRepo = tagsWithDates.map((tag) => {
            const tagCommit = commits.find((commit) => commit.sha === tag.sha);
            const date = new Date(tag.date).toLocaleString("en-US", dateOptions);
            return {
                ...tag,
                isInPullRequest: !!tagCommit,
                date
            };
        });
        newTagTable = tagsForRepo.reduce((acc, tag, ind) => {
            if (tag.isInPullRequest) {
                return acc + `| ${tag.name} | ${tag.date} |\n`;
            }
            return acc;
        }, "| Release Tag | Date Tagged |\n|-----|---------------|\n");

        existingTagTable = tagsForRepo.reduce((acc, tag, ind) => {
            if (!tag.isInPullRequest) {
                const date = new Date(tag.date).toLocaleString("en-US", dateOptions);
                return acc + `| ${tag.name} | ${date} |\n`;
            }
            return acc;
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
        `## New Tags\n\n${newTagTable}\n\n## Existing Tags\n\n${existingTagTable}`
    );
}

main();