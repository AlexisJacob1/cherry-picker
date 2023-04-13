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
	}
}