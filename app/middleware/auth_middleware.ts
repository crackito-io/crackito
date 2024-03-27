import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken';
import { jwtDecode } from "jwt-decode";
import env from '#start/env'

export default class AuthMiddleware {
  async handle({ request, response, view, logger }: HttpContext, next: NextFn) {
    // get jwt from cookies et vérification
    const jwtToken = request.cookie('jwt')
    if (jwtToken == null) {
      logger.info({tag : '#F80F1A'}, 'JWT Token is null, redirection to the login page')
      response.redirect().toPath('/login')
      return
    }

    // if jwt signature is valid
    try {
      jwt.verify(jwtToken, env.get('APP_KEY'));
      logger.info({tag : '#73753D'}, 'JWT is valid, decode and send to the next')
    } catch(err) {
      logger.info({tag : '#D85C18'}, 'JWT Token invalid, redirection to the login page')
      response.redirect().toPath('/login')
      return
    }

    const decoded : any = jwtDecode(jwtToken);

    view.share({
      firstname: decoded.firstname,
      lastname: decoded.lastname,
      email: decoded.email_address,
      version: process.env.VERSION
    })
    
    const output = await next()
    return output
  }
}