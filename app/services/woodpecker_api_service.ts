import env from '#start/env'
import axios from 'axios'

export default class WoodpeckerApiService {
  triggerPipeline(repo_id: number, default_branch: string) {
    return new Promise<void>(async (resolve, reject) => {
      const access_token = `Bearer ${env.get('WOODPECKER_TOKEN')}`
      const url = `${env.get('WOODPECKER_URL')}/api/repos/${repo_id}/pipelines`
      try {
        await this.postMethod(
          url,
          {
            branch: default_branch,
            variables: {},
          },
          {
            Authorization: access_token,
          }
        )
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  private postMethod(url: string, body: object, headers: object) {
    return axios.post(url, body, {
      headers: headers,
    })
  }
}
