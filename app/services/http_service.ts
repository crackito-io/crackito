import axios, { AxiosInstance } from 'axios'

export class HttpService {
  private readonly default_header: object
  private client: AxiosInstance

  constructor(base_url: string, default_header: object = {}) {
    this.default_header = default_header
    this.client = axios.create({ baseURL: base_url })
  }

  post(url: string, body: object, headers: object = {}) {
    headers = { ...this.default_header, ...headers }
    return this.client.post(url, body, {
      headers: headers,
    })
  }

  get(url: string, headers: object = {}) {
    headers = { ...this.default_header, ...headers }
    return this.client.get(url, {
      headers: headers,
    })
  }

  put(url: string, body: object, headers: object = {}) {
    headers = { ...this.default_header, ...headers }
    return this.client.put(url, body, {
      headers: headers,
    })
  }

  delete(url: string, headers: object = {}) {
    headers = { ...this.default_header, ...headers }
    return this.client.delete(url, {
      headers: headers,
    })
  }

  patch(url: string, body: object, headers: object = {}) {
    headers = { ...this.default_header, ...headers }
    return this.client.patch(url, body, {
      headers: headers,
    })
  }
}
