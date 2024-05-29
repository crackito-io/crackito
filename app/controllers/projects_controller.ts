import type { HttpContext } from '@adonisjs/core/http'

import GiteaApiService, { GiteaProtectedBranch, GiteaWebhook } from '#services/gitea_api_service'
import { CreateStudentsRepoDto, CreateStudentsRepoSchema } from '../dto/CreateStudentsRepo.dto.js'
import ProjectDatabaseService from '#services/project_database_service'
import UserDatabaseService from '#services/user_database_service'
import { v4 as uuidv4 } from 'uuid'
import { inject } from '@adonisjs/core'

export default class ProjectsController {
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
      logger.error({ tag: '#A13F2F' }, 'Create Student Exercise validation failed')
      response.badRequest({ message: 'Create Student Exercise validation failed', error: error })
      return
    }

    let webhook: GiteaWebhook = {
      url: body.webhook_url,
      secret: '',
    }

    let protection: GiteaProtectedBranch = {
      branch: body.protected.branch,
      files: body.protected.files,
    }

    let newName

    for (let team of body.teams) {
      webhook.secret = uuidv4()
      newName = `${body.name}-${team.join('-')}`
      try {
        await this.initGiteaProject(body.name, newName, team, webhook, protection, giteaApiService)
      } catch (e) {
        logger.error({ tag: '#DDA2FF' }, `Error while creating repo in gitea : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }
      const [code, message, title] = await projectDatabaseService.createTeam(newName, body.name, team, webhook.secret, userDatabaseService)
      if (code !== 200) {
        try {
          // rollback create in gitea
          await giteaApiService.deleteRepository(newName)
        } catch (e2) {
          logger.error({ tag: '#DFA2FF' }, `Error while rollback the creation of repo in gitea after database error : ${JSON.stringify(e2)}`)
          response.status(e2.status).send({ status_code: e2.status, status_message: e2.message })
          return
        }
        logger.error({ tag: '#DFA20F' }, 'Error while adding project to database, gitea rollback...')
        response.status(code).send({status_code: code, status_message: i18n.t(`translate.${message}`), title: i18n.t(`translate.${title}`)})
        return
      }
    }

    logger.info({ tag: '#DD3AFA'}, 'Teams projects created in gitea and database successfully')
    response.status(200).send({ status_code: 200, status_message: 'Teams projects created successfully' })
  }
}
