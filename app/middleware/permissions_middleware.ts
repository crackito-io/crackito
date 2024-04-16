import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { jwtDecode } from 'jwt-decode'
import fs from 'node:fs/promises'

export default class PermissionsMiddleware {
  async handle(ctx: HttpContext, next: NextFn, permissions: Array<string>) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))
    const jwtTokenPermission = jwtToken.permission

    if (jwtTokenPermission === null) {
      return this.raiseUnknownError(ctx)
    }

    // load permissions to integer values association file
    let associativePermissions = await this.getPermissionsJsonObject()

    // check if an exception occured or if the file exists but is empty (no exception but null)
    if (associativePermissions === null) {
      return this.raiseUnknownError(ctx)
    }

    // calculate required permissions integer from permissions list
    let requiredPermissionIntegerValue = 0
    for (let perm of permissions) {
      requiredPermissionIntegerValue += associativePermissions[perm]
    }

    // check authorization with specific permission integer value
    let authorized = this.isAuthorized(jwtTokenPermission, requiredPermissionIntegerValue)

    if (!authorized) {
      // if not authorized, search unique or multiple missing permission(s)
      let missingPermissionsList = this.getMissingPermissions(jwtTokenPermission, requiredPermissionIntegerValue, associativePermissions)
      ctx.session.flash('notification',
        missingPermissionsList.map((_: string) => ({
          type: 'danger',
          title: ctx.i18n.t('translate.missing_perm'),
          message: ctx.i18n.t(`translate.${_.toLowerCase()}_missing_perm`),
        }))
      )
      return ctx.response.redirect().back()
    }

    const output = await next()
    return output
  }

  raiseUnknownError(ctx: HttpContext) {
    ctx.session.flash('notification', {
      type: 'danger',
      title: ctx.i18n.t('translate.error'),
      message: ctx.i18n.t('translate.unknown_error'),
    })
    ctx.response.redirect().back()
  }

  async getPermissionsJsonObject() {
    let associativePermissions = null
    try {
      const data = await fs.readFile('resources/permissions/permissions.json', 'utf8')
      associativePermissions = JSON.parse(data)
    } catch (error) {
      return null
    }

    return associativePermissions
  }

  isAuthorized(jwtTokenPermission: number, requiredPermissionIntegerValue: number) {
    // check authorization by comparing token permission integer value and required permission integer value
    return (jwtTokenPermission & requiredPermissionIntegerValue) === requiredPermissionIntegerValue
  }

  getMissingPermissions(jwtTokenPermission: number, requiredPermissionIntegerValue: number, associativePermissions: any): string[] {
    const invertedAssociativePermissions = Object.fromEntries(
      Object.entries(associativePermissions).map(([key, value]) => [value, key])
    )

    let missingPermissionsIntegerValue = null
    let missingPermissionsList = []

    // get value of the missing permission(s)
    missingPermissionsIntegerValue = requiredPermissionIntegerValue - (jwtTokenPermission & requiredPermissionIntegerValue)

    // if there is only one missing permission, if undefined, then missingPermissionsIntegerValue is not a 2^n value
    // that means there are more than one missing permission, we'll have to decompose the value in a 2^n sum
    let missingUniquePermission = invertedAssociativePermissions[missingPermissionsIntegerValue]

    // if there is more than one missing permission
    if (missingUniquePermission === undefined) {
      // power 2 binary decomposition to get all the missing permissions (11 = 8 + 2 + 1)
      let power = 0

      while (missingPermissionsIntegerValue > 0) {
        if (missingPermissionsIntegerValue % 2 === 1) {
          missingPermissionsList.push(invertedAssociativePermissions[Math.pow(2, power)])
        }
        missingPermissionsIntegerValue = Math.floor(missingPermissionsIntegerValue / 2)

        power++
      }
    } else {
      missingPermissionsList = [missingUniquePermission]
    }

    return missingPermissionsList
  }
}
