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
    super(repo, 'translate.repo_not_found')
  }
}

export class GitRepositoryAlreadyExists extends GitRepositoryError {
  constructor(repo: string) {
    super(repo, 'translate.repo_already_exists')
  }
}

export class GitRepositoryNotATemplate extends GitRepositoryError {
  constructor(repo: string) {
    super(repo, 'translate.repo_not_template')
  }
}

export class GitRepositoryEmpty extends GitRepositoryError {
  constructor(repo: string) {
    super(repo, 'translate.repo_empty')
  }
}

export class GitContentFileNotFound implements IsPrintableErrorMessage {
  constructor(
    private repo: string,
    private file: string
  ) {}

  getPrintableErrorMessage(i18n: I18n): string {
    return i18n.t('translate.file_not_found', { file: this.file, repo: this.repo })
  }
}

export class UserNotFound implements IsPrintableErrorMessage {
  constructor(private username: string) {}

  getPrintableErrorMessage(i18n: I18n): string {
    return i18n.t('translate.user_not_found_gitea', { username: this.username })
  }
}
