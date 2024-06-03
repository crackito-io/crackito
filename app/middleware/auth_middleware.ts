import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken'
import { jwtDecode } from 'jwt-decode'
import env from '#start/env'

export default class AuthMiddleware {
  async handle({ request, response, view, logger, i18n }: HttpContext, next: NextFn) {
    // get jwt from cookies et vérification
    const jwtToken = request.cookie('jwt')
    if (jwtToken === null) {
      if (request.ajax()) {
        logger.info({ tag: '#F80F1A' }, 'JWT Token is null and req is ajax, sending 401 to the current page')
        return response
          .status(401)
          .send({ status_code: 401, status_message: i18n.t('translate.not_authorized_error'), title: i18n.t('translate.error') })
      } else {
        logger.info({ tag: '#40C223' }, 'JWT Token is null, redirection to the login page')
        return response.redirect().toPath('/login')
      }
    }

    // if jwt signature is valid
    try {
      jwt.verify(jwtToken, env.get('APP_KEY'))
      logger.info({ tag: '#73753D' }, 'JWT is valid, decode and send to the next')
    } catch (err) {
      if (request.ajax()) {
        logger.info({ tag: '#0012A5' }, 'JWT Token is null and req is ajax, sending 401 to the current page')
        return response
          .status(401)
          .send({ status_code: 401, status_message: i18n.t('translate.not_authorized_error'), title: i18n.t('translate.error') })
      } else {
        logger.info({ tag: '#F801AA' }, 'JWT Token is not valid, redirection to the login page')
        response.redirect().toPath('/login')
      }
      return
    }

    const decoded: any = jwtDecode(jwtToken)

    view.share({
      firstname: decoded.firstname,
      lastname: decoded.lastname,
      email: decoded.email_address,
      version: process.env.VERSION,
    })

    const output = await next()
    return output
  }
}
