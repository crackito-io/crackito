import { I18n } from '@adonisjs/i18n'

interface IsPrintableErrorMessage {
  getPrintableErrorMessage(i18n: I18n): string
}

class GitRepositoryError implements IsPrintableErrorMessage {
  constructor(
    private repo: string,
    private error_id: string
  ) {}

  getPrintableErrorMessage(i18n: I18n): string {
    return i18n.t(this.error_id, { repo: this.repo })
  }
}

export class ExternalAPIError extends Error implements IsPrintableErrorMessage {
  error_details: IsPrintableErrorMessage | undefined

  constructor(
    public status: number,
    public http_request: object,
    public raw_error: Error,
    public message: string
  ) {
    super(message)
    this.raw_error = raw_error
  }

  addErrorDetails(error_details: IsPrintableErrorMessage) {
    this.error_details = error_details
  }

  getPrintableErrorMessage(i18n: I18n): string {
    if (this.error_details !== undefined) {
      return this.error_details.getPrintableErrorMessage(i18n)
    } else {
      return this.message
    }
  }
}

export class GitRepositoryNotFound extends GitRepositoryError {
  constructor(repo: string) {
    super(repo, 'repo_not_found')
  }
}

export class GitRepositoryAlreadyExists extends GitRepositoryError {
  constructor(repo: string) {
    super(repo, 'repo_already_exists')
  }
}

export class GitRepositoryNotATemplate extends GitRepositoryError {
  constructor(repo: string) {
    super(repo, 'repo_not_template')
  }
}

export class UserNotFound implements IsPrintableErrorMessage {
  constructor(private username: string) {}

  getPrintableErrorMessage(i18n: I18n): string {
    return i18n.t('user_not_found', { username: this.username })
  }
}
