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

export class GitRepositoryNotFound extends GitException {
  repo_name: string

  constructor(repo_name: string, message: string, data: object) {
    super(404, message, data)
    this.repo_name = repo_name
  }
}

export class GitRepositoryAlreadyExists extends GitException {
  repo_name: string

  constructor(repo_name: string, message: string, data: object) {
    super(409, message, data)
    this.repo_name = repo_name
  }
}

export class GitRepositoryNotATemplate extends GitException {
  repo_name: string

  constructor(repo_name: string, message: string, data: object) {
    super(422, message, data)
    this.repo_name = repo_name
  }
}
