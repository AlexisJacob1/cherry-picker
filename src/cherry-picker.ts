import * as core from '@actions/core'
import * as github from '@actions/github'
import {existsSync, readFileSync, readdirSync} from 'fs'

export class CherryPicker {
	protected client: ReturnType<typeof github.getOctokit>

	constructor() {
		const token: string | undefined = core.getInput('repo-token')
		if (!token) {
			throw new Error('Invalid token')
		}
		this.client = github.getOctokit(token)
	}

	async cherryPickLastCommitAndReportToDevelop(): Promise<void> {
		const pullRequestNumber: number | undefined =
			github.context.payload.pull_request?.number

		if (pullRequestNumber === undefined) {
			throw new Error('No pull request number')
		}

		const pullRequest = await this.client.rest.pulls.get({
			owner: github.context.repo.owner,
			repo: github.context.repo.repo,
			pull_number: pullRequestNumber
		})
		console.log('Pull request fetched successfully')

		const repository = await this.client.rest.repos.get({
			owner: github.context.repo.owner,
			repo: github.context.repo.repo
		})
		console.log('Repository fetched successfully')

		const createdPullRequest = await this.client.rest.pulls.create({
			owner: github.context.repo.owner,
			repo: github.context.repo.repo,
			base: repository.data.default_branch,
			head: pullRequest.data.head.label,
			title: `Report #${pullRequest.data.number} to ${repository.data.default_branch}`,
			body: this.getPullRequestBody(
				pullRequest.data.number,
				repository.data.default_branch
			)
		})
		console.log('Pull request created successfully')

		await this.client.rest.issues.addLabels({
			owner: github.context.repo.owner,
			repo: github.context.repo.repo,
			issue_number: createdPullRequest.data.number,
			labels: ['report-from-prod']
		})
		console.log('Labels added successfully')

		await this.client.rest.issues.addAssignees({
			owner: github.context.repo.owner,
			repo: github.context.repo.repo,
			issue_number: createdPullRequest.data.number,
			assignees: [github.context.actor]
		})
		console.log('Assignees added successfully')

		console.log(
			`Pull request ${pullRequest.data.title} (#${createdPullRequest.data.number}) created successfully`
		)
	}

	private getPullRequestBody(
		initialPullRequestNumber: number,
		defaultBranchName: string
	): string {
		const message: string[] = [
			`This is a pull request that was created to report #${initialPullRequestNumber} on ${defaultBranchName}`,
			'You might need to rebase the pulled branch before merging it'
		]

		console.log(readdirSync('./'))
		if (existsSync('./CODEOWNERS')) {
			const fileContent = readFileSync('./CODEOWNERS', 'utf-8')
			for (const line of fileContent.split(/\r?\n/)) {
				message.push(line.trim())
			}
		} else {
			core.info('No CODEOWNERS file found. Skipping...')
		}

		message.push(`@${github.context.actor}`)

		return message.join('\r\n')
	}
}
