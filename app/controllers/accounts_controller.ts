import type { HttpContext } from '@adonisjs/core/http'
import UserDatabaseService from '#services/user_database_service'
import GitTeaApiService from '#services/gitea_api_service'

import { prisma } from '#config/app'
import { jwtDecode } from 'jwt-decode'
import { UserCreateDto, UserCreateSchema } from '../dto/UserCreate.dto.js'
import { inject } from '@adonisjs/core'
import { ExternalAPIError } from '#services/custom_error'

export default class AccountsController {
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

  @inject()
  async createAccount(ctx: HttpContext, userDatabaseService: UserDatabaseService, gitTeaApiService: GitTeaApiService) {
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

    let body = ctx.request.body()

    let usernameNumber = 1
    let username = body.firstname.toLowerCase() + body.lastname.toLowerCase()

    while (await userDatabaseService.usernameAlreadyExists(username + usernameNumber)) {
      usernameNumber++
    }

    username = username + usernameNumber

    try {
      await gitTeaApiService.createUser(
        username,
        body.password,
        body.email,
        body.firstname,
        body.lastname
      )
    } catch (error) {
      if (error instanceof ExternalAPIError) {
        ctx.logger.info({ tag: '#0982DD' }, `Gitea error after creating a user : ${JSON.stringify(error)}`)
        return ctx.response.status(error.status).send({
          status_code: error.status,
          status_message: error.getPrintableErrorMessage(ctx.i18n),
          title: ctx.i18n.t('translate.error'),
          user: null,
        })
      }
    }

    let [code, message, title, user] = await userDatabaseService.createUser(
      idOrganization,
      body.email,
      body.password,
      body.firstname,
      body.lastname,
      username
    )

    if (code === 500) {
      ctx.logger.info({ tag: '#0D822D' }, 'Database error after creating a user')
      try {
        await gitTeaApiService.deleteUser(username)
      } catch (error2) {
        ctx.logger.info({ tag: '#10DDDD' }, `Gitea error after removing a user (you have to manually remove the user) : ${JSON.stringify(error2)}`)
        // we do not response the page with gitea error because it's a 500 error
      }
    }

    return ctx.response.status(code).send({
      status_code: code,
      status_message: ctx.i18n.t(`translate.${message}`),
      title: ctx.i18n.t(`translate.${title}`),
      user: user,
    })
  }

  @inject()
  async deleteAccount(ctx: HttpContext, userDatabaseService: UserDatabaseService) {
    // get jwtToken
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    // get current user organization id
    const idOrganization = jwtToken.id_organization

    if (idOrganization === null) {
      ctx.logger.info({ tag: '#F123FA' }, `JWT Token idOrganization attributes is null, sending 401 to the current page`)
      return ctx.response.status(401).send({status_code: 401, status_message: ctx.i18n.t('translate.unknown_error'), title: ctx.i18n.t('translate.error')})
    }

    // get current user id
    const idAccount = jwtToken.id_account

    if (idAccount === null) {
      ctx.logger.info({ tag: '#0F89FF' }, `JWT Token idAccount attributes is null, sending 401 to the current page`)
      return ctx.response.status(401).send({status_code: 401, status_message: ctx.i18n.t('translate.unknown_error'), title: ctx.i18n.t('translate.error')})
    }

    const [code, message, title] = await userDatabaseService.deleteUser(idAccount, idOrganization, ctx.params.id)
    return ctx.response.status(code).send({status_code: code, status_message: ctx.i18n.t(`translate.${message}`), title: ctx.i18n.t(`translate.${title}`)})
  }
}
