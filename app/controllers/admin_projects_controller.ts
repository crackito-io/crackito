import GithubApiService from '#services/github_api_service'
import GiteaApiService, { GiteaProtectedBranch, GiteaWebhook } from '#services/gitea_api_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ProjectCreateDto, ProjectCreateSchema } from '../dto/ProjectCreate.dto.js'
import { jwtDecode } from 'jwt-decode'
import env from '#start/env'
import { v4 as uuidv4 } from 'uuid'
import ProjectDatabaseService from '#services/project_database_service'
import UserDatabaseService from '#services/user_database_service'

export default class AdminProjectsController {
  private webhook_owner_url_gitevent: string = env.get('CRACKITO_URL') + env.get('GITEVENT_OWNER_PATH')

  @inject()
  async newProject(ctx: HttpContext, githubApiService: GithubApiService) {
    let templates
    try {
      templates = await githubApiService.getTemplatesList()
    } catch (e) {
      console.log(e)
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.unknown_error'),
      })
      return ctx.response.redirect().back()
    }

    let templatesName = templates.data.map((t) => t.name)
    return ctx.view.render('features/admin/new_project', { templates: templatesName })
  }

  @inject()
  async createProject(
    { request, response, logger, i18n }: HttpContext,
    giteaApiService: GiteaApiService,
    githubApiService: GithubApiService,
    projectDatabaseService: ProjectDatabaseService,
    userDatabaseService: UserDatabaseService
  ) {
    // get jwtToken
    const jwtToken: any = jwtDecode(request.cookie('jwt'))

    // get current user organization id
    const idAccount = jwtToken.id_account

    if (idAccount === null) {
      return response.status(401).send({status_code: 401, status_message: ctx.i18n.t('translate.unknown_error'), title: ctx.i18n.t('translate.error')})
    }

    let projectCreateDto: ProjectCreateDto

    try {
      projectCreateDto = ProjectCreateSchema.parse(request.body())
    } catch (error) {
      console.log(error)
      logger.info({ tag: '#831234' }, 'Project create validation failed')
      response.badRequest({ status_code: 400, status_message: i18n.t(`translate.user_create_field_not_valid`), title: i18n.t('translate.error') })
      return
    }

    let webhook: GiteaWebhook = {
      url: this.webhook_owner_url_gitevent,
      secret: uuidv4(),
    }

    // transform project name to git convention
    let repoName = projectCreateDto.name.replace(/ /g, '-').toLowerCase()
    let template = projectCreateDto.template

    if (template) {
      // get all templates from github
      let templateList
      try {
        templateList = await githubApiService.getTemplatesList()
      } catch (e) {
        logger.error({ tag: '#4DF0DF' }, `Error while getting all templates from github : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.getPrintableErrorMessage(i18n), title: i18n.t('translate.external_error_github') })
        return
      }
      let templateUsed = templateList.data.find((e) => e.name === template)
      if (!templateUsed || !templateUsed.html_url) {
        logger.info({ tag: '#4310DF' }, `Template not found (${template})`)
        response.badRequest({ status_code: 401, status_message: 'Template not found', title: i18n.t('translate.external_error_github')})
        return
      }

      try {
        await giteaApiService.migrateRepository(templateUsed.html_url, repoName)
      } catch (e) {
        logger.info({ tag: '#441119' }, `Error while migrate repository from github template : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.getPrintableErrorMessage(i18n), title: i18n.t('translate.external_error_gitea') })
        return
      }

      try {
        await giteaApiService.convertToTemplate(repoName)
      } catch (e) {
        logger.error({ tag: '#44DD19' }, `Error while converting repository to github template : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.getPrintableErrorMessage(i18n), title: i18n.t('translate.external_error_gitea') })
        return
      }
    } else {
      try {
        await giteaApiService.createRepository(repoName)
      } catch (e) {
        logger.info({ tag: '#F430DD' }, `Error while creating template repo in gitea : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.getPrintableErrorMessage(i18n), title: i18n.t('translate.external_error_gitea') })
        return
      }
    }

    // get username from id
    let user = await userDatabaseService.getUserFromId(idAccount)
    if (!user || !user.username) {
      logger.info({ tag: '#F43A8D' }, 'User with this owner id does not exist')
      response.internalServerError({ status_code: 500, status_message: i18n.t('translate.internal_server_error'), title: i18n.t('translate.error') })
      return
    }

    try {
      await giteaApiService.addMemberToRepository(repoName, user.username)
    } catch (e) {
      logger.info({ tag: '#1125FD' }, `Error while adding owner to template repo in gitea : ${JSON.stringify(e)}`)
      response.status(e.status).send({ status_code: e.status, status_message: e.getPrintableErrorMessage(i18n), title: i18n.t('translate.error') })
      return
    }

    try {
      await giteaApiService.addWebhook(repoName, webhook)
    } catch (e) {
      logger.info({ tag: '#FF0124' }, `Error while adding webhook to template repo in gitea : ${JSON.stringify(e)}`)
      response.status(e.status).send({ status_code: e.status, status_message: e.getPrintableErrorMessage(i18n), title: i18n.t('translate.error') })
      return
    }

    const [code, message, title] = await projectDatabaseService.createProject(
      repoName,
      projectCreateDto.name,
      projectCreateDto.description || null,
      true,
      projectCreateDto.limit_datetime || null,
      idAccount,
      webhook.secret
    )
    if (code !== 200) {
      try {
        // rollback create in gitea
        await giteaApiService.deleteRepository(repoName)
      } catch (e) {
        logger.error({ tag: '#111D4F' }, `Error while rollback the creation of template repo in gitea after database error : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message, title: i18n.t('translate.error') })
        return
      }
      logger.info({ tag: '#D101FF' }, 'Error while adding project to database, gitea rollback...')
      response.status(code).send({status_code: code, status_message: i18n.t(`translate.${message}`), title: i18n.t(`translate.${title}`)})
      return
    }

    logger.info({ tag: '#AA3AFA' }, 'Project created in gitea and database successfully')
    response.status(200).send({ status_code: 200, status_message: i18n.t('translate.project_created'), title: i18n.t('translate.success') })
  }
}
