import { HttpContext } from '@adonisjs/core/http'
import { PostLoginDto, PostLoginSchema } from '../dto/PostLogin.dto.js'
import env from '#start/env'
import { prisma } from '#config/app'
import jwt from 'jsonwebtoken';
import bcrypt from "bcrypt";

export default class AuthController {
  public async login({ request, response }: HttpContext) {
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

    // Creating the jwt token
    const tokenContent = {
      id_account: account.id_account,
      firstname: account.Firstname,
      lastname: account.Lastname,
      email_address: account.email_address,
      id_organization: account.id_organization,
    }
    const token = jwt.sign(tokenContent, env.get('APP_KEY'))

    response.cookie('jwt', token)
  }
}
