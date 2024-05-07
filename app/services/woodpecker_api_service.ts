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
}
