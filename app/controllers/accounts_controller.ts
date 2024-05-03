import type { HttpContext } from '@adonisjs/core/http'
import UserDatabaseService from '#services/user_database_service'

import { prisma } from '#config/app'
import { jwtDecode } from 'jwt-decode'
import { UserCreateDto, UserCreateSchema } from '../dto/UserCreate.dto.js'

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

  async newAccount({ view }: HttpContext) {
    return view.render('features/admin/new_account')
  }

  async createAccount(ctx: HttpContext) {
    // get jwtToken
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    // get current user organization id
    const idOrganization = jwtToken.id_organization

    if (idOrganization === null) {
      return ctx.response.status(401).send({status_code: 401, status_message: ctx.i18n.t('translate.unknown_error'), title: ctx.i18n.t('translate.error')})
    }

    let userCreateDto: UserCreateDto

    try {
      userCreateDto = await UserCreateSchema.parseAsync(ctx.request.body())
    } catch (error) {
      // return custom error only if mail already exist, otherwise, the user has
      let first_response_error = error.issues[0].message == 'mail_already_taken' ? 'mail_already_taken' : 'user_create_field_not_valid'
      ctx.response.status(400).send({status_code: 400, status_message: ctx.i18n.t(`translate.${first_response_error}`), title: ctx.i18n.t('translate.error')})
      return
    }

    this.userService = UserDatabaseService.getInstance(idOrganization)

    let body = ctx.request.body()
    const [code, message, title, user] = await this.userService.createUser(body.email, body.password, body.confirmPassword, body.firstname, body.lastname)

    return ctx.response.status(code).send({status_code: code, status_message: ctx.i18n.t(`translate.${message}`), title: ctx.i18n.t(`translate.${title}`), user: user})
  }
}
