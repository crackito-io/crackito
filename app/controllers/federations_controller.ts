import type { HttpContext } from '@adonisjs/core/http'
import FederationDatabaseService from '#services/federation_database_service'

import { jwtDecode } from 'jwt-decode'
import { inject } from '@adonisjs/core'

export default class FederationsController {
  @inject()
  async listFederations({ view, session, request, response, i18n }: HttpContext, federationDatabaseService: FederationDatabaseService) {
    // get jwtToken
    const jwtToken: any = jwtDecode(request.cookie('jwt'))

    // get current user organization id
    const idOrganization = jwtToken.id_organization

    if (idOrganization === null) {
      session.flash('notifications', {
        type: 'danger',
        title: i18n.t('translate.error'),
        message: i18n.t('translate.unknown_error'),
      })
      return response.redirect().back()
    }

    federationDatabaseService.setUserIdOrganization(idOrganization)

    // get all federations in the user organization
    const [code, message, title, data] = await federationDatabaseService.getAllFederations()
    return view.render('features/admin/federations', {
      federationsInOrganization: data,
    })
  }
}
