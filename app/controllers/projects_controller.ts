import type { HttpContext } from '@adonisjs/core/http'

import GiteaApiService, { GiteaProtectedBranch, GiteaWebhook } from '#services/gitea_api_service'
import { CreateStudentsRepoDto, CreateStudentsRepoSchema } from '../dto/CreateStudentsRepo.dto.js'
import { CreateRepoDto, CreateRepoSchema } from '../dto/CreateRepo.dto.js'
import ProjectDatabaseService from '#services/project_database_service'
import UserDatabaseService from '#services/user_database_service'
import { v4 as uuidv4 } from 'uuid'
import { inject } from '@adonisjs/core'
import GithubApiService from '#services/github_api_service'

export default class ProjectsController {
  /**
   * Init one student project in gitea
   */
  async initGiteaProject(
    repo_name: string,
    newName: string,
    members: Array<string>,
    webhook: GiteaWebhook,
    protection: GiteaProtectedBranch,
    giteaApiService: GiteaApiService
  ) {
    await giteaApiService.getOwner()
    let membersRepo
    membersRepo = await giteaApiService.createRepoFromTemplate(repo_name, newName)

    let repoName = membersRepo.data.name

    for (let member of members) {
      await giteaApiService.addMemberToRepository(repoName, member)
    }
    await giteaApiService.addWebhook(repoName, webhook)
    await giteaApiService.protectBranch(repoName, protection)

    return membersRepo
  }

  @inject()
  async createStudentsProject({ request, response, logger, i18n }: HttpContext, giteaApiService: GiteaApiService, projectDatabaseService: ProjectDatabaseService, userDatabaseService: UserDatabaseService) {
    const body = request.body()

    let createStudentsRepoDto: CreateStudentsRepoDto
    try {
      createStudentsRepoDto = CreateStudentsRepoSchema.parse(body)
    } catch (error) {
      logger.info({ tag: '#A13F2F' }, 'Create Student Exercise validation failed')
      response.badRequest({ message: 'Form not valid', error: error })
      return
    }

    let webhook: GiteaWebhook = {
      url: createStudentsRepoDto.webhook_url,
      secret: '',
    }

    let protection: GiteaProtectedBranch = {
      branch: createStudentsRepoDto.protected.branch,
      files: createStudentsRepoDto.protected.files,
    }

    let newName

    for (let team of createStudentsRepoDto.teams) {
      webhook.secret = uuidv4()
      newName = `${createStudentsRepoDto.name}-${team.join('-')}`
      try {
        await this.initGiteaProject(createStudentsRepoDto.name, newName, team, webhook, protection, giteaApiService)
      } catch (e) {
        logger.info({ tag: '#DDA2FF' }, `Error while creating repo in gitea : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }
      const [code, message, title] = await projectDatabaseService.createTeam(newName, createStudentsRepoDto.name, team, webhook.secret, userDatabaseService)
      if (code !== 200) {
        try {
          // rollback create in gitea
          await giteaApiService.deleteRepository(newName)
        } catch (e2) {
          logger.error({ tag: '#DFA2FF' }, `Error while rollback the creation of repo in gitea after database error : ${JSON.stringify(e2)}`)
          response.status(e2.status).send({ status_code: e2.status, status_message: e2.message })
          return
        }
        logger.info({ tag: '#DFA20F' }, 'Error while adding team to database, gitea rollback...')
        response.status(code).send({status_code: code, status_message: i18n.t(`translate.${message}`), title: i18n.t(`translate.${title}`)})
        return
      }
    }

    logger.info({ tag: '#DD3AFA' }, 'Teams projects created in gitea and database successfully')
    response.status(200).send({ status_code: 200, status_message: 'Teams projects created successfully' })
  }

  @inject()
  async createProject({ request, response, logger, i18n }: HttpContext, giteaApiService: GiteaApiService, githubApiService: GithubApiService, projectDatabaseService: ProjectDatabaseService) {
    const body = request.body()

    let createRepoDto: CreateRepoDto
    try {
      createRepoDto = CreateRepoSchema.parse(body)
    } catch (error) {
      logger.info({ tag: '#34452D' }, 'Create Exercise validation failed')
      response.badRequest({ message: 'Form not valid', error: error })
      return
    }

    let webhook: GiteaWebhook = {
      url: createRepoDto.webhook_url,
      secret: createRepoDto.token_project,
    }

    // transform project name to git convention
    let repoName = createRepoDto.name.replace(/ /g, '-').toLowerCase()
    let template = createRepoDto.template

    if (template) {
      // get all templates from github
      let templateList
      try {
        templateList = await githubApiService.getTemplatesList()
      } catch (e) {
        logger.error({ tag: '#4DF0DF' }, `Error while getting all templates from github : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }
      let templateUsed = templateList.data.find((e) => e.name === template)
      if (!templateUsed || !templateUsed.html_url) {
        logger.info({ tag: '#4310DF' }, `Template not found (${template})`)
        response.badRequest({ message: `Template ${template} not found` })
        return
      }

      try {
        await giteaApiService.migrateRepository(templateUsed.html_url, repoName)
      } catch (e) {
        logger.info({ tag: '#441119' }, `Error while migrate repository from github template : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }

      try {
        await giteaApiService.convertToTemplate(repoName)
      } catch (e) {
        logger.error({ tag: '#44DD19' }, `Error while converting repository to github template : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }
    } else {
      try {
        await giteaApiService.createRepository(repoName)
      } catch (e) {
        logger.info({ tag: '#4430DD' }, `Error while creating template repo in gitea : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }
    }

    try {
      await giteaApiService.addWebhook(repoName, webhook)
    } catch (e) {
      logger.info({ tag: '#FF0124' }, `Error while adding webhook to template repo in gitea : ${JSON.stringify(e)}`)
      response.status(e.status).send({ status_code: e.status, status_message: e.message })
      return
    }

    const [code, message, title] = await projectDatabaseService.createProject(
      repoName,
      createRepoDto.name,
      createRepoDto.description,
      true,
      createRepoDto.limit_datetime,
      createRepoDto.owner_id,
      createRepoDto.token_project
    )
    if (code !== 200) {
      try {
        // rollback create in gitea
        await giteaApiService.deleteRepository(repoName)
      } catch (e) {
        logger.error({ tag: '#111D4F' }, `Error while rollback the creation of template repo in gitea after database error : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }
      logger.info({ tag: '#D101FF' }, 'Error while adding project to database, gitea rollback...')
      response.status(code).send({status_code: code, status_message: i18n.t(`translate.${message}`), title: i18n.t(`translate.${title}`)})
      return
    }

    logger.info({ tag: '#AA3AFA' }, 'Project created in gitea and database successfully')
    response.status(200).send({ status_code: 200, status_message: 'Project created successfully' })
  }
}
