import GiteaApiService, { GiteaProtectedBranch, GiteaWebhook } from '#services/gitea_api_service'
import WoodpeckerApiService from '#services/woodpecker_api_service'
import ProjectDatabaseService from '#services/project_database_service'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CiTestsResultDto, CiTestsResultSchema } from '../dto/CiTestsResult.dto.js'
import { GitEventResultDto, GitEventResultSchema } from '../dto/GitEventResult.dto.js'
import { CreateStudentsRepoDto, CreateStudentsRepoSchema } from '../dto/CreateStudentsRepo.dto.js'
import env from '#start/env'
import UserDatabaseService from '#services/user_database_service'
import { v4 as uuidv4 } from 'uuid'

export default class ApiEndpointsController {
  private webhook_url: string = env.get('CRACKITO_URL') + env.get('CI_RESULTS_PATH')

  @inject()
  async gitEvent({ request, response, logger }: HttpContext, woodpeckerApiService: WoodpeckerApiService, projectDatabaseService: ProjectDatabaseService, giteaApiService: GiteaApiService) {
    const body = request.body()

    let gitEventResultDto: GitEventResultDto
    try {
      gitEventResultDto = GitEventResultSchema.parse(body)
    } catch (error) {
      logger.info({ tag: '#E33F2F' }, 'Git event result validation failed')
      response.badRequest({ message: 'Git event result validation failed', error: error })
      return
    }

    // unique name from crackito git account (crackito/<name>)
    const teamRepoName = body.repository.name
    const team = await projectDatabaseService.getTeamFromTeamRepoName(teamRepoName)

    if (team === null) {
      logger.info({ tag: '#11EA2F' }, 'Team repo name not associated to a team')
      return response.badRequest({ message: 'Team repo name is not associated to a team' })
    }

    if (!team.webhook_secret) {
      logger.info({ tag: '#441A2F' }, 'Team associated with this team repo name does have a token')
      return response.badRequest({ message: 'Team associated with this team repo name does have a token' })
    }

    const giteaRepoId: number = body.repository.id
    const giteaRepoFullName: string = body.repository.full_name
    const defaultBranch: string = body.repository.default_branch

    let repoRequest
    try {
      repoRequest = await woodpeckerApiService.getRepositoryByFullName(giteaRepoFullName)
    } catch (e) {
      if (e.status !== 404) {
        logger.info({ tag: '#FFA342' }, `Error during the get of the repo : ${JSON.stringify(e)}`)
        response.badRequest({ message: `Error during the get of the repo.` })
        return
      }
    }

    let repoId

    if (!repoRequest || !repoRequest.data.active) {
      let createResult
      try {
        createResult = await woodpeckerApiService.activateRepository(giteaRepoId)
      } catch (error) {
        logger.info({ tag: '#AAD242' }, `Error during the activation of the repo : ${JSON.stringify(error)}`)
        response.internalServerError({ message: 'Error during the activation of the repo.' })
        return
      }
      try {
        // remove the webhooks created by woodpecker
        await giteaApiService.removeCIWebhook(teamRepoName)
      } catch (error2) {
        logger.info({ tag: '#DDA2FF' }, `Error while removing the CI webhook of the repo in gitea : ${JSON.stringify(error2)}`)
        response.internalServerError({ message: 'Error while removing the CI webhook of the repo in gitea.' })
        return
      }
      repoId = createResult.data.id
      try {
        await woodpeckerApiService.addSecretToRepository(repoId, 'CALLBACK_TOKEN', team.webhook_secret)
      } catch (error3) {
        logger.info({ tag: '#11D2AA' }, `Error during the sending of the callback token to the repo, maybe the token is aready known by woodpecker : ${JSON.stringify(error3)}`)
        response.internalServerError({ message: 'Error during the sending of the callback token to the repo.' })
        return
      }
      try {
        await woodpeckerApiService.addSecretToRepository(repoId, 'WEBHOOK_URL', this.webhook_url)
      } catch (error4) {
        logger.info({ tag: '#11AADA' }, `Error during the sending of the webhook url to the repo, maybe the url is aready known by woodpecker : ${JSON.stringify(error4)}`)
        response.internalServerError({ message: 'Error during the sending of the webhook url to the repo.' })
        return
      }
    } else {
      const repo = repoRequest.data
      repoId = repo.id
    }

    try {
      await woodpeckerApiService.triggerPipeline(repoId, defaultBranch)
    } catch (error4) {
      logger.info({ tag: '#DD1342' }, `Error during the triggering of the pipeline : ${JSON.stringify(error4)}`)
      response.internalServerError({ message: 'Error during the triggering of the pipeline.' })
      return
    }
  }

  @inject()
  async ciResult({ request, response, logger }: HttpContext, projectDatabaseService: ProjectDatabaseService) {
    const body = request.body()

    let ciTestsResultDto: CiTestsResultDto
    try {
      ciTestsResultDto = await CiTestsResultSchema.parseAsync(body)
    } catch (error) {
      logger.info({ tag: '#135F2F' }, 'CI tests results validation failed')
      response.badRequest({ message: 'CI tests results validation failed', error: error })
      return
    }

    // not verif in dto, otherwise there would be 2 requests (one verif and one to get the team)
    let team = await projectDatabaseService.getTeamFromToken(ciTestsResultDto.token)

    if (team === null) {
      logger.info({ tag: '#EEF12F' }, 'Token/Webhook Secret not associated to a team')
      return response.badRequest({ message: 'Token/Webhook Secret is not associated to a team' })
    }

    // all team test in database
    let testsTeam = team.test.map((t) => ({
      step_name: t.step_name,
      test_name: t.test_name,
      status_passed: t.status_passed,
    }))

    // all test in request
    let testsBody = body.steps.flatMap((s) =>
      s.tests.map((t2) => ({
        id_team: team.id_team,
        repo_name: team.repo_name,
        step_name: s.name,
        test_name: t2.name,
        status_passed: t2.passed,
        error: t2.passed ? 'OK' : t2.error,
        message: t2.passed ? null : t2.message,
      }))
    )

    // intersec of both to get the test that have a changed state
    let testsChanged = testsBody.filter((t) => {
      let matchedTest = testsTeam.find(
        (t2) => t2.step_name === t.step_name && t2.test_name === t.test_name
      )
      return matchedTest && t.status_passed !== matchedTest.status_passed
    })

    for (let test of testsChanged) {
      let update = await projectDatabaseService.updateTestFromTeam(
        test.id_team,
        test.repo_name,
        test.step_name,
        test.test_name,
        test.status_passed,
        test.error,
        test.message
      )
      if (!update) {
        logger.info({ tag: '#0932D0' }, 'One test update does not pass, potentially one test does not exist')
        return response.internalServerError({ message: 'One test not found' })
      }
    }

    return response.ok({ message: `${testsChanged.length} tests updated` })
  }

  @inject()
  async createRepo({ request, response }: HttpContext, giteaApiService: GiteaApiService) {
    const body = request.body()

    if (!body.name) {
      response.badRequest({ message: 'Name is required' })
    }

    let name: string = body.name.replace(/\s+/g, ' ').replace(/\ /gi, '-')

    let result = await giteaApiService.createRepository(name)
    response.send(result.data)
  }

  @inject()
  async addMemberToRepo({ request, response }: HttpContext, giteaApiService: GiteaApiService) {
    const body = request.body()

    if (!body.name || !body.members) {
      response.badRequest({ message: 'Repo name and members are required' })
    }

    for (let member of body.members) {
      let result = await giteaApiService.addMemberToRepository(body.name, member)
      if (result.status === 404) {
        response.badRequest({ message: result.statusText })
      }
    }

    response.send({ message: 'Members added successfully' })
  }

  async initGiteaProject(
    repo_name: string,
    newName: string,
    members: Array<string>,
    webhook: GiteaWebhook,
    protection: GiteaProtectedBranch,
    giteaApiService: GiteaApiService
  ) {
    await giteaApiService.getOWner()
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
        logger.info({ tag: '#DDA2FF' }, `Error while creating repo in gitea : ${JSON.stringify(e)}`)
        response.status(e.status).send({ status_code: e.status, status_message: e.message })
        return
      }
      const [code, message, title] = await projectDatabaseService.createTeam(newName, body.name, team, webhook.secret, userDatabaseService)
      if (code !== 200) {
        try {
          // rollback create in gitea
          await giteaApiService.deleteRepository(newName)
        } catch (e2) {
          logger.info({ tag: '#DFA2FF' }, `Error while rollback the creation of repo in gitea after database error : ${JSON.stringify(e2)}`)
          response.status(e2.status).send({ status_code: e2.status, status_message: e2.message })
          return
        }
        logger.info({ tag: '#DFA20F' }, 'Error while adding project to database, gitea rollback...')
        response.status(code).send({status_code: code, status_message: i18n.t(`translate.${message}`), title: i18n.t(`translate.${title}`)})
        return
      }
    }

    response.status(200).send({ status_code: 200, status_message: 'Teams projects created successfully' })
  }
}
