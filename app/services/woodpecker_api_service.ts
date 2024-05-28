import env from '#start/env'
import { HttpService } from '#services/http_service'
import { ExternalAPIError } from '#services/custom_error'

export default class WoodpeckerApiService {
  private http_service: HttpService = new HttpService(`${env.get('WOODPECKER_URL')}/api`, {
    Authorization: `Bearer ${env.get('WOODPECKER_TOKEN')}`,
  })

  async triggerPipeline(repo_id: number, default_branch: string) {
    const url = `/repos/${repo_id}/pipelines`
    try {
      return await this.http_service.post(url, {
        branch: default_branch,
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

  async getRepositoryByFullName(repoFullName: string) {
    const url = `/repos/lookup/${repoFullName}`
    try {
      return await this.http_service.get(url)
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  async activateRepository(repo_id: number) {
    const url = `/repos?forge_remote_id=${repo_id}`
    try {
      return await this.http_service.post(url, {})
    } catch (error) {
      throw new ExternalAPIError(
        error.response.status,
        error.response.data,
        error,
        error.response.data.message
      )
    }
  }

  async addSecretToRepository(repo_id: number, secret_name: string, secret_value: string) {
    const url = `/repos/${repo_id}/secrets`
    let body = { events: ['manual'], name: secret_name, value: secret_value, repo_id: repo_id }
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
}
