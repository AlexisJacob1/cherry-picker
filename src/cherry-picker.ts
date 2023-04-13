import * as core from '@actions/core'
import * as github from '@actions/github'

export class CherryPicker {
	
	protected client: ReturnType<typeof github.getOctokit>;

	constructor() {
		const token: string | undefined = core.getInput('repo-token');
		if (!token) {
			throw new Error("Invalid token");
		}
		this.client = github.getOctokit(token);
	}

	cherryPickLastCommitAndReportToDevelop() {
		const pullRequestNumber: number | undefined = github.context.payload.pull_request?.number;

		if (pullRequestNumber === undefined) {
			throw new Error("No pull request number");
		}

		Promise.all([
			this.client.rest.pulls.get({			
				owner: github.context.repo.owner,
				repo: github.context.repo.repo,
				pull_number: pullRequestNumber
			}),
			this.client.rest.repos.get({
				owner: github.context.repo.owner,
				repo: github.context.repo.repo,
			})
		])
		.then((response) => {
			const [pullRequest, repo] = response;

			this.client.rest.pulls.create({
				owner: github.context.repo.owner,
				repo: github.context.repo.repo,
				base: repo.data.default_branch,
				head: pullRequest.data.head.label,
				title: `[REPORT] Report ${pullRequest.data.number} to ${repo.data.default_branch}`
			})
			.then((createdPullRequest) => {
				this.client.rest.issues.addLabels({
					owner: github.context.repo.owner,
					repo: github.context.repo.repo,
					issue_number: createdPullRequest.data.number,
					labels: ['report-to-develop']
				}).then(() => {
					
				})
				.catch((err) => {
					throw new Error(err);
				})
			})
			.catch((error) => {
				throw new Error(error);
			});
		})
		.catch((error) => {
			throw new Error(error);
		});
	}
}