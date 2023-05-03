import * as core from '@actions/core'
import * as github from '@actions/github'
import { execSync } from 'child_process';

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

			const branchName = `cherry-pick_${pullRequestNumber}`;
			this.createNewBranchForCherryPick(repo.data.default_branch, pullRequest.data.head.sha, branchName);

			this.client.rest.pulls.create({
				owner: github.context.repo.owner,
				repo: github.context.repo.repo,
				base: repo.data.default_branch,
				head: branchName,
				title: `Report #${pullRequest.data.number} to ${repo.data.default_branch}`,
				body: `This is a pull request that was created to report #${pullRequest.data.number} on ${repo.data.default_branch}`
			})
			.then((createdPullRequest) => {
				this.client.rest.issues.addLabels({
					owner: github.context.repo.owner,
					repo: github.context.repo.repo,
					issue_number: createdPullRequest.data.number,
					labels: ['report-from-prod']
				}).then(() => {
					console.log(`Pull request #${pullRequest.data.labels} (${createdPullRequest.data.number}) created successfully`);
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

	private createNewBranchForCherryPick(baseBranch: string, commitSha: string, branchName: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			
			console.log(`Fetching branches`);
			execSync(`git fetch --all`);

			console.log(`Checking out base branch`);
			execSync(`git checkout ${baseBranch}`);

			console.log(`Creating new branch ${branchName}`);
			execSync(`git checkout ${branchName}`);
			
			console.log(`Cherry picking ${commitSha}`);
			execSync(`git cherry-pick ${commitSha}`);
			
			console.log(`Pushing ${branchName} to remote`);
			execSync(`git push --set-upstream origin ${branchName}`);

			resolve();
		})
	}
}