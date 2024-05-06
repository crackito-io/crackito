import type { HttpContext } from '@adonisjs/core/http'
import UserDatabaseService from '#services/user_database_service'

import { prisma } from '#config/app'
import { jwtDecode } from 'jwt-decode'
import { inject } from '@adonisjs/core'

export default class AccountsController {
  userService: UserDatabaseService | undefined

  async listAccounts({ view, session, request, response, i18n }: HttpContext) {
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

  @inject()
  async deleteAccount(ctx: HttpContext, userDatabaseService: UserDatabaseService) {
    // get jwtToken
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    // get current user organization id
    const idOrganization = jwtToken.id_organization

    if (idOrganization === null) {
      return ctx.response.status(401).send({status_code: 401, status_message: ctx.i18n.t('translate.unknown_error'), title: ctx.i18n.t('translate.error')})
    }

    // get current user id
    const idAccount = jwtToken.id_account

    if (idAccount === null) {
      return ctx.response.status(401).send({status_code: 401, status_message: ctx.i18n.t('translate.unknown_error'), title: ctx.i18n.t('translate.error')})
    }

    userDatabaseService.setUserIdOrganization(idOrganization)
    userDatabaseService.setUserId(idAccount)

    // checker auto-suppression ??
    const [code, message, title] = await userDatabaseService.deleteUser(ctx.params.id)
    return ctx.response.status(code).send({status_code: code, status_message: ctx.i18n.t(`translate.${message}`), title: ctx.i18n.t(`translate.${title}`)})
  }
}
