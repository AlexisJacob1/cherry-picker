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
		console.log("Context payload");
		console.log(JSON.stringify(github.context.payload.pull_request, undefined, 4));

		const pullRequestNumber: number | undefined = github.context.payload.pull_request?.number;

		if (pullRequestNumber === undefined) {
			throw new Error("No pull request number")
		}

		this.client.rest.pulls.get({			
			owner: github.context.repo.owner,
			repo: github.context.repo.repo,
			pull_number: pullRequestNumber
		})
		.then((pullRequest) => {
			console.log(pullRequest.data.merge_commit_sha);
		})
		.catch((error) => {
			throw new Error(error);
		});
	}
}