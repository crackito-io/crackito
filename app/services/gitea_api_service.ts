import env from '#start/env'
import axios from 'axios'

export default class GiteaApiService {
  private owner_name: string = ''
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

  async addMemberToRepository(repo_name: string, username: string) {
    await this.getOWner()
    const url = `${this.api_url}/repos/${this.owner_name}/${repo_name}/collaborators/${username}`
    const body = {
      permission: 'write',
    }
    try {
      let result = await this.putMethod(url, body, { Authorization: this.access_token })
      return result
    } catch (error) {
      let error_ = {
        status: error.response.status,
        statusText: error.response.data.message,
      }
      return error_
    }
  }

  private postMethod(url: string, body: object, headers: object) {
    return axios.post(url, body, {
      headers: headers,
    })
  }

  private getMethod(url: string, headers: object) {
    return axios.get(url, {
      headers: headers,
    })
  }

  private putMethod(url: string, body: object, headers: object) {
    return axios.put(url, body, {
      headers: headers,
    })
  }

  private async getOWner() {
    if (this.owner_name) {
      return
    }
    const url = `${this.api_url}/user`
    const result = await this.getMethod(url, { Authorization: this.access_token })
    this.owner_name = result.data.username
  }
}
