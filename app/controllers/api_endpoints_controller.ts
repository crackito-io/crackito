import GiteaApiService, { GiteaProtectedBranch, GiteaWebhook } from '#services/gitea_api_service'
import WoodpeckerApiService from '#services/woodpecker_api_service'
import ProjectDatabaseService from '#services/project_database_service'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CiTestsResultDto, CiTestsResultSchema } from '../dto/CiTestsResult.dto.js'

export default class ApiEndpointsController {
  @inject()
  async gitEvent({ request, response }: HttpContext, woodpeckerApiService: WoodpeckerApiService) {
    //TODO : vérifier le schéma de la requête
    //TODO : vérifier que le répo existe bien
    //TODO : vérifier qu'il n'existe pas de pipeline en cours

    const repo_id = request.body().repository.id
    const default_branch = request.body().repository.default_branch

    try {
      await woodpeckerApiService.triggerPipeline(repo_id, default_branch)
    } catch (error) {
      response.badRequest({ message: 'Error during the triggering of the pipeline.' })
      return
    }
  }

  @inject()
  async ciResult({ request, response, logger }: HttpContext, projectDatabaseService: ProjectDatabaseService) {
    const body = request.body()

    let ciTestsResultDto: CiTestsResultDto
    try {
      ciTestsResultDto = await CiTestsResultSchema.parseAsync(request.body())
    } catch (error) {
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

  @inject()
  async createStudentTP({ request, response }: HttpContext, giteaApiService: GiteaApiService) {
    const body = request.body()

    if (!body.name || !body.members) {
      response.badRequest({ message: 'Repo name and members are required' })
    }

    if (!body.webhook) {
      response.badRequest({ message: 'Webhook is required' })
    }

    if (!body.webhook.url || !body.webhook.secret) {
      response.badRequest({ message: 'Webhook url and secret are required' })
    }

    if (!body.protected) {
      response.badRequest({ message: 'Protected branches are required' })
    }

    if (!body.protected.branch || !body.protected.files) {
      response.badRequest({ message: 'Protected branches and files are required' })
    }

    let webhook: GiteaWebhook = {
      url: body.webhook.url,
      secret: body.webhook.secret,
    }

    let protection: GiteaProtectedBranch = {
      branch: body.protected.branch,
      files: body.protected.files,
    }

    for (let member of body.members) {
      await giteaApiService.initTP(body.name, member, webhook,protection)
    }

    response.send({ message: 'Fork created successfully' })
  }
}
