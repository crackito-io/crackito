import { GiteaApiService, GiteaProtectedBranch, GiteaWebhook } from '#services/gitea_api_service'
import WoodpeckerApiService from '#services/woodpecker_api_service'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

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

  async ciResult({ request, response }: HttpContext) {
    console.log(request.body().status)
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
