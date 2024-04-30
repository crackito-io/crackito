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
            template: true,
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

  async initTP(repo_name: string, members: Array<string>) {
    await this.getOWner()
    let members_repo = await this.repoFromTemplate(repo_name, `${repo_name}-${members.join('-')}`)
    for (let member of members) {
      await this.addMemberToRepository(members_repo, member)
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

  private async repoFromTemplate(repo_name: string, fork_name: string) {
    const url = `${this.api_url}/repos/${this.owner_name}/${repo_name}/generate`
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
    const result = await this.postMethod(url, body, { Authorization: this.access_token })

    return result.data.name
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
