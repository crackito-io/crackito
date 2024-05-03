import env from '#start/env'
import { HttpService } from '#services/http_service'
import {
  GitRepositoryAlreadyExists,
  GitRepositoryNotFound,
  GitUserNotFound,
} from '#services/custom_error'

export type GiteaWebhook = {
  url: string
  secret: string
}

export type GiteaProtectedBranch = {
  branch: string
  files: Array<string>
}

export class GiteaApiService {
  private owner_name: string = ''
  private access_token: string = `Bearer ${env.get('GITEA_TOKEN')}`
  private api_url: string = `${env.get('GITEA_URL')}/api/v1`
  private http_service: HttpService = new HttpService(this.api_url, {
    Authorization: this.access_token,
  })

  async createRepository(repo_name: string) {
    const url: string = `/user/repos`
    try {
      return await this.http_service.post(url, {
        name: repo_name,
        auto_init: true,
        default_branch: 'main',
        private: true,
        template: true,
      })
    } catch (error) {
      return {
        status: error.response.status,
        statusText: error.response.data.message,
        data: error.response.config.data,
      }
    }
  }

  async addMemberToRepository(repo_name: string, username: string) {
    await this.getOWner()
    const url = `/repos/${this.owner_name}/${repo_name}/collaborators/${username}`
    const body = {
      permission: 'write',
    }
    try {
      return await this.http_service.put(url, body)
    } catch (error) {
      return {
        status: error.response.status,
        statusText: error.response.data.message,
        data: error.response.config.data,
      }
    }
  }

  async initTP(
    repo_name: string,
    members: Array<string>,
    webhook: GiteaWebhook,
    protection: GiteaProtectedBranch
  ) {
    await this.getOWner()
    let newName = `${repo_name}-${members.join('-')}`
    let membersRepo = await this.repoFromTemplate(repo_name, newName)

    if (membersRepo.status === 422) {
      throw new Error(membersRepo.statusText + ' ' + repo_name)
    } else if (membersRepo.status !== 201) {
      throw new Error(membersRepo.statusText + ' ' + newName)
    }
    let repoName = membersRepo.data.name

    for (let member of members) {
      await this.addMemberToRepository(repoName, member)
    }
    await this.addWebhook(repoName, webhook)
    await this.protectBranch(repoName, protection)
  }

  private async addWebhook(repo_name: string, webhook: GiteaWebhook) {
    await this.getOWner()
    const url = `/repos/${this.owner_name}/${repo_name}/hooks`
    const body = {
      active: true,
      type: 'gitea',
      authorization_header: webhook.secret,
      branch_filter: 'main',
      config: {
        url: webhook.url,
        content_type: 'json',
        http_method: 'post',
      },
      events: ['push'],
    }
    return await this.http_service.post(url, body)
  }

  private async protectBranch(repo_name: string, protection: GiteaProtectedBranch) {
    const url = `/repos/${this.owner_name}/${repo_name}/branch_protections`
    const body = {
      branch_name: protection.branch,
      enable_push: true,
      protected_file_patterns: protection.files.join(';'),
    }
    return await this.http_service.post(url, body)
  }

  private async repoFromTemplate(repo_name: string, fork_name: string) {
    const url = `/repos/${this.owner_name}/${repo_name}/generate`
    const body = {
      name: fork_name,
      owner: this.owner_name,
      default_branch: 'main',
      git_content: true,
      private: true,
      git_hooks: false,
      labels: false,
      webhooks: false,
    }
    try {
      return await this.http_service.post(url, body)
    } catch (error) {
      if (error.response.status === 404) {
        throw new GitRepositoryNotFound(repo_name, error.response.data.message, error.response.data)
      } else if (error.response.status === 409) {
        throw new GitRepositoryAlreadyExists(
          fork_name,
          error.response.data.message,
          error.response.data
        )
      }
    }
  }

  private async getOWner() {
    if (this.owner_name) {
      return
    }
    const url = `/user`
    const result = await this.http_service.get(url)
    this.owner_name = result.data.username
  }
}
