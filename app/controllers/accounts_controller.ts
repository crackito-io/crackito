import type { HttpContext } from '@adonisjs/core/http'

import { prisma } from '#config/app'
import { jwtDecode } from 'jwt-decode'

export default class AccountsController {
  async listAccounts({ view, request }: HttpContext) {
    // get jwtToken
    const jwtToken: any = jwtDecode(request.cookie('jwt'))

    // get current user organization id
    const idOrganization = jwtToken.id_organization

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
