import env from '#start/env'
import axios from 'axios'

export default class GiteaApiService {
  private access_token: string = `Bearer ${env.get('GITEA_TOKEN')}`
  private api_url: string = `${env.get('GITEA_URL')}/api/v1`

  createRepository(repo_name: string) {
    const url = `${this.api_url}/user/repos`

    return new Promise<any>((resolve, reject) => {
      try {
        const result = this.postMethod(
          url,
          {
            name: repo_name,
            auto_init: true,
            default_branch: 'main',
            private: true,
          },
          {
            Authorization: this.access_token,
          }
        )
        resolve(result)
      } catch (error) {
        reject(new Error(error))
      }
    })
  }

  private postMethod(url: string, body: object, headers: object) {
    return axios.post(url, body, {
      headers: headers,
    })
  }
}
