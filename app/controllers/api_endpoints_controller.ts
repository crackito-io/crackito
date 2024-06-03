import GiteaApiService from '#services/gitea_api_service'
import WoodpeckerApiService from '#services/woodpecker_api_service'
import ProjectDatabaseService from '#services/project_database_service'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CiTestsResultDto, CiTestsResultSchema } from '../dto/CiTestsResult.dto.js'
import { GitEventResultDto, GitEventResultSchema } from '../dto/GitEventResult.dto.js'
import env from '#start/env'

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

    const [code, message, title] = await projectDatabaseService.updateTeamLastCommit(team.id_team)
    if (code !== 200) {
      logger.error({ tag: '#DFA20F' }, 'Error while updating last commit team to database')
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

    // json formatted, all test in request
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

    // ----------------------------- 1 : create non existant steps received from json -----------------------------
    // distinct intersection of json formatted and project steps to get the steps to add in database
    // distinct because there are same step_name for multiple test
    let stepsToCreate: Array<string> = Array.from(
      new Set(
        testsBody
          .filter((t) => !team.project.step.find((t2) => t2.step_name === t.step_name))
          .map((t) => t.step_name)
      )
    )

    for (let stepName of stepsToCreate) {
      const [code, message, title] = await projectDatabaseService.createStep(1, stepName, stepName, stepName, team.repo_name)
      if (code !== 200) {
        logger.error({ tag: '#09C2DC' }, `The step ${stepName} creation failed`)
        return response.status(code).send({ status_code: code, status_message: message, title: title })
      }
    }

    // ----------------------------- 2 : create non existant tests and existant tests with passed state changed -----------------------------
    // intersection of json formatted and team tests to get the tests to add(if new)/change(if passed state change) in database
    let testsChanged = testsBody.filter((t) => {
      let matchedTest = testsTeam.find(
        (t2) => t2.step_name === t.step_name && t2.test_name === t.test_name
      )
      return !matchedTest || (matchedTest && t.status_passed !== matchedTest.status_passed)
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
        logger.error({ tag: '#0FF241' }, 'One test update does not pass, potentially one test does not exist')
        return response.internalServerError({ message: 'One test not found' })
      }
    }

    // ----------------------------- 3 : delete existant steps not received from json -----------------------------
    let testsToDelete = testsTeam.filter((t) => {
      return !testsBody.some((t2) => t2.step_name === t.step_name && t2.test_name === t.test_name)
    })
    for (let test of testsToDelete) {
      const [code, message, title] = await projectDatabaseService.deleteTest(
        team.id_team,
        team.repo_name,
        test.step_name,
        test.test_name
      )
      if (code !== 200) {
        logger.error({ tag: '#0F32D0' }, `The test ${test.test_name} deletion failed`)
        return response.status(code).send({ status_code: code, status_message: message, title: title })
      }
    }

    // ----------------------------- 4 : delete existant steps not received from json -----------------------------
    let stepsToDelete: Array<string> = Array.from(
      new Set(
        team.project.step
          .filter((t) => !testsBody.some((t2) => t2.step_name === t.step_name))
          .map((t) => t.step_name)
      )
    )
    for (let stepName of stepsToDelete) {
      const [code, message, title] = await projectDatabaseService.deleteStep(
        team.repo_name,
        stepName
      )
      if (code !== 200) {
        logger.error({ tag: '#09F2D0' }, `The step ${stepName} deletion failed`)
        return response.status(code).send({ status_code: code, status_message: message, title: title })
      }
    }

    return response.ok({ message: `${testsChanged.length} tests added/updated, ${stepsToCreate.length} steps added, ${testsToDelete.length} tests deleted, ${stepsToDelete.length} steps deleted` })
  }

  @inject()
  async ciResultOwner({ request, response, logger }: HttpContext, projectDatabaseService: ProjectDatabaseService) {
    const body = request.body()

    let ciTestsResultDto: CiTestsResultDto
    try {
      ciTestsResultDto = await CiTestsResultSchema.parseAsync(body)
    } catch (error) {
      logger.info({ tag: '#F35F2F' }, 'CI tests results validation failed')
      response.badRequest({ message: 'CI tests results validation failed', error: error })
      return
    }

    // not verif in dto, otherwise there would be 2 requests (one verif and one to get the team)
    let project = await projectDatabaseService.getProjectFromToken(ciTestsResultDto.token)

    if (project === null) {
      logger.info({ tag: '#CEF12F' }, 'Token not associated to a project')
      return response.badRequest({ message: 'Token is not associated to a project' })
    }

    // json formatted, all test in request
    let testsBody = ciTestsResultDto.steps.flatMap((s) =>
      s.tests.map((t2) => ({
        repo_name: project.repo_name,
        step_name: s.name,
        test_name: t2.name,
        status_passed: t2.passed,
        error: t2.passed ? 'OK' : t2.error,
        message: t2.passed ? null : t2.message,
      }))
    )

    // ----------------------------- 1 : create non existant steps received from json -----------------------------
    // distinct intersection of json formatted and project steps to get the steps to add in database
    // distinct because there are same step_name for multiple test
    let stepsToCreate: Array<string> = Array.from(
      new Set(
        testsBody
          .filter((t) => !project.step.find((t2) => t2.step_name === t.step_name))
          .map((t) => t.step_name)
      )
    )

    for (let stepName of stepsToCreate) {
      const [code, message, title] = await projectDatabaseService.createStep(1, stepName, stepName, stepName, project.repo_name)
      if (code !== 200) {
        logger.error({ tag: '#F945D0' }, `The step ${stepName} creation failed`)
        return response.status(code).send({ status_code: code, status_message: message, title: title })
      }
    }

    // ----------------------------- 2 : delete existant steps not received from json -----------------------------
    let stepsToDelete: Array<string> = Array.from(
      new Set(
        project.step
          .filter((t) => !testsBody.some((t2) => t2.step_name === t.step_name))
          .map((t) => t.step_name)
      )
    )
    for (let stepName of stepsToDelete) {
      const [code, message, title] = await projectDatabaseService.deleteStep(
        project.repo_name,
        stepName
      )
      if (code !== 200) {
        logger.error({ tag: '#053DD0' }, `The step ${stepName} deletion failed`)
        return response.status(code).send({ status_code: code, status_message: message, title: title })
      }
    }

    return response.ok({ message: `${stepsToCreate.length} steps added, ${stepsToDelete.length} steps deleted` })
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
}
