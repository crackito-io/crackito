import { HttpService } from '#services/http_service'
import { ExternalAPIError } from '#services/custom_error'

export default class GithubApiService {
  private http_service: HttpService = new HttpService(`https://api.github.com`, {})

  async getTemplatesList() {
    const url: string = '/orgs/crackito-templates/repos'
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
}
