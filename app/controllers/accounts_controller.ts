import type { HttpContext } from '@adonisjs/core/http'

import { prisma } from '#config/app'
import { jwtDecode } from 'jwt-decode'

export default class AccountsController {
  async listAccounts({ view, session, request, response, i18n }: HttpContext) {
    // get jwtToken
    const jwtToken: any = jwtDecode(request.cookie('jwt'))

    // get current user organization id
    const idOrganization = jwtToken.id_organization

    if (idOrganization === null) {
      session.flash('notification', {
        type: i18n.t('translate.error'),
        message: i18n.t('translate.unknown_error'),
      })
      return response.redirect().back()
    }

    // get all accounts in the user organization
    const accountsInOrganization = await prisma.account.findMany({
      where: {
        id_organization: {
          equals: idOrganization,
        },
      },
    })

    return view.render('features/admin/accounts', {
      accountsInOrganization: accountsInOrganization,
    })
  }
}
