import env from '#start/env'
import { HttpService } from '#services/http_service'
import {
  GitRepositoryAlreadyExists,
  GitRepositoryNotATemplate,
  GitRepositoryNotFound,
  UserNotFound,
  ExternalAPIError,
} from '#services/custom_error'

export type GiteaWebhook = {
  url: string
  secret: string
}

export type GiteaProtectedBranch = {
  branch: string
  files: Array<string>
}

export default class GiteaApiService {
  private owner_name: string = ''
  private http_service: HttpService = new HttpService(`${env.get('GITEA_URL')}/api/v1`, {
    Authorization: `Bearer ${env.get('GITEA_TOKEN')}`,
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
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  async addMemberToRepository(repo_name: string, username: string) {
    await this.getOWner()
    await this.memberExist(username)
    const url = `/repos/${this.owner_name}/${repo_name}/collaborators/${username}`
    const body = {
      permission: 'write',
    }
    try {
      return await this.http_service.put(url, body)
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  async initExercise(
    repo_name: string,
    members: Array<string>,
    webhook: GiteaWebhook,
    protection: GiteaProtectedBranch
  ) {
    await this.getOWner()
    let newName = `${repo_name}-${members.join('-')}`
    let membersRepo = await this.createRepoFromTemplate(repo_name, newName)
    let repoName = membersRepo.data.name

    for (let member of members) {
      await this.addMemberToRepository(repoName, member)
    }
    await this.addWebhook(repoName, webhook)
    await this.protectBranch(repoName, protection)

    return membersRepo
  }

  async createUser(
    username: string,
    password: string,
    email: string,
    first_name: string,
    last_name: string
  ) {
    const url = `/admin/users`
    const body = {
      username: username,
      password: password,
      email: email,
      full_name: first_name + ' ' + last_name,
      login_name: username,
      must_change_password: false,
      restricted: false,
      send_notify: false,
      source_id: 0,
      visibility: 'public',
    }
    try {
      return await this.http_service.post(url, body)
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  async removeCIWebhook(repo_name: string) {
    await this.getOWner()
    const url = `/repos/${this.owner_name}/${repo_name}/hooks`
    try {
      const result = await this.http_service.get(url)
      for (let hook of result.data) {
        if (hook.config.url.includes(env.get('WOODPECKER_URL'))) {
          await this.deleteWebhook(repo_name, hook.id)
        }
      }
    } catch (error) {
      if (error.response.status === 404) {
        let externalError: ExternalAPIError = new ExternalAPIError(
          error.response.status,
          error.response.data,
          error,
          error.response.data.message
        )
        externalError.addErrorDetails(new GitRepositoryNotFound(repo_name))
        throw externalError
      }
    }
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
    try {
      return await this.http_service.post(url, body)
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  private async deleteWebhook(repo_name: string, webhook_id: number) {
    await this.getOWner()
    const url = `/repos/${this.owner_name}/${repo_name}/hooks/${webhook_id}`
    try {
      return await this.http_service.delete(url)
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  private async protectBranch(repo_name: string, protection: GiteaProtectedBranch) {
    const url = `/repos/${this.owner_name}/${repo_name}/branch_protections`
    const body = {
      branch_name: protection.branch,
      enable_push: true,
      protected_file_patterns: protection.files.join(';'),
    }
    try {
      return await this.http_service.post(url, body)
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  private async createRepoFromTemplate(repo_name: string, fork_name: string) {
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
      let externalError: ExternalAPIError = new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
      if (error.response.status === 404) {
        externalError.addErrorDetails(new GitRepositoryNotFound(repo_name))
        throw externalError
      } else if (error.response.status === 409) {
        externalError.addErrorDetails(new GitRepositoryAlreadyExists(fork_name))
        throw externalError
      } else if (error.response.status === 422) {
        externalError.addErrorDetails(new GitRepositoryNotATemplate(repo_name))
        throw externalError
      }
      throw externalError
    }
  }

  private async getOWner() {
    if (this.owner_name) {
      return
    }
    const url = `/user`
    try {
      const result = await this.http_service.get(url)
      this.owner_name = result.data.username
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  private async memberExist(username: string) {
    const url = `/users/${username}`
    try {
      await this.http_service.get(url)
      return true
    } catch (error) {
      let externalError: ExternalAPIError = new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
      externalError.addErrorDetails(new UserNotFound(username))
      throw externalError
    }
  }
}
