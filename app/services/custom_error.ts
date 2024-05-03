class GitException extends Error {
  status: number
  description: string
  data: object

  constructor(status: number, description: string, data: object) {
    super(description)
    this.status = status
    this.description = description
    this.data = data
  }
}

export class GitUserNotFound extends GitException {
  username: string

  constructor(username: string, data: object) {
    super(404, `User ${username} not found`, data)
    this.username = username
  }
}
