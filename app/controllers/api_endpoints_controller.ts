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
      response.badRequest({ message: "Error during the triggering of the pipeline." })
      return
    }
  }

  async ciResult({request, response}: HttpContext){
    console.log(request.body().status)
  }
}
