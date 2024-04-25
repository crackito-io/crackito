import { HttpContext } from '@adonisjs/core/http'
import { PostLoginDto, PostLoginSchema } from '../dto/PostLogin.dto.js'
import env from '#start/env'
import { prisma } from '#config/app'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'
import Permissions from '#utils/permissions_loader';

export default class AuthController {
  async login({ request, response }: HttpContext) {
    let postLoginDto: PostLoginDto;
    try {
      postLoginDto = PostLoginSchema.parse(request.body())
    } catch (error) {
      response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    // Get account from database
    const account = await prisma.account.findFirst({
      where: {
        email_address: postLoginDto.email,
      },
    })

    if (account == null || account.password == null) {
      response.badRequest({ message: "Email address or password doesn't exist" })
      return
    }

    const match = bcrypt.compareSync(postLoginDto.password, account.password)
    if (!match) {
      response.badRequest({ message: "Password doesn't match with this email address" })
      return
    }

    // load permissions to integer values association file
    let associativePermissions = Permissions.getInstance().getJsonObject()

    // check if an exception occured or if the file exists but is empty (no exception but null)
    if (associativePermissions === null) {
      response.internalServerError({
        message: 'The server encountered an error and could not complete your request',
      })
      return
    }

    // get user roles
    let accountRoles = await prisma.account_role.findMany({
      where: {
        id_account: {
          equals: account.id_account,
        },
      },
      // get role list (not get by default)
      include: {
        role: {
          include: {
            role_permission: true,
          },
        },
      },
    })

    // get user permissions binary value from roles

    let sumPerms = 0

    if (accountRoles !== null) {
      let codePermissions = [
        ...new Set(
          accountRoles.flatMap((accountRole) =>
            accountRole.role.role_permission.map((permission) => permission.code_permission)
          )
        ),
      ]

      for (let codePermission of codePermissions) {
        sumPerms += associativePermissions[codePermission]
      }
    }

    // Creating the jwt token
    const tokenContent = {
      id_account: account.id_account,
      firstname: account.Firstname,
      lastname: account.Lastname,
      email_address: account.email_address,
      id_organization: account.id_organization,
      permission: sumPerms,
    }

    const token = jwt.sign(tokenContent, env.get('APP_KEY'))

    response.cookie('jwt', token)
  }
}
