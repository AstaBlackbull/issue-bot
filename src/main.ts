import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import * as fs from 'fs'

interface MaintainersConfig {
  admin: string[]
  maintainer: string[]
  developer: string[]
}

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true })
    const octokit = github.getOctokit(token)

    // Get the issue number and comment body from the payload
    const issueNumber = github.context.payload.issue?.number
    const commentBody = github.context.payload.comment?.body

    if (!issueNumber || !commentBody) {
      throw new Error('Issue number or comment body not found in the payload.')
    }

    // Load maintainers config from maintainers.yaml
    const maintainersConfig: MaintainersConfig = yaml.load(
      fs.readFileSync('maintainers.yaml', 'utf8')
    )

    // Extract the list of maintainers based on the comment
    let assignees: string[] = []
    if (commentBody.includes('/assign')) {
      if (commentBody.includes('@admin')) {
        assignees = assignees.concat(maintainersConfig.admin)
      }
      if (commentBody.includes('@maintainer')) {
        assignees = assignees.concat(maintainersConfig.maintainer)
      }
      if (commentBody.includes('@developer')) {
        assignees = assignees.concat(maintainersConfig.developer)
      }
    }

    if (assignees.length === 0) {
      throw new Error('No valid assignees found in the comment.')
    }

    // Assign the issue to the extracted list of users
    await octokit.rest.issues.addAssignees({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: issueNumber,
      assignees: assignees
    })

    core.info(
      `Issue ${issueNumber} assigned to ${assignees.join(', ')} successfully.`
    )
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

run()
