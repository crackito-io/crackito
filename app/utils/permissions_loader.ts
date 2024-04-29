import { prisma } from '#config/app'

export default class Permissions {
  static instance: Permissions
  jsonObject: { [key: string]: number }

  constructor() {
    this.jsonObject = {}
  }

  async init() {
    const permissions = await prisma.permission.findMany({
      orderBy: {
        code_permission: 'asc',
      },
    })

    for (const [index, perm] of permissions.entries()) {
      this.jsonObject[perm.code_permission] = Math.pow(2, index)
    }
  }

  static async getInstance() {
    if (!Permissions.instance) {
      Permissions.instance = new Permissions()
      await Permissions.instance.init()
    }

    return Permissions.instance.getJsonObject()
  }

  private getJsonObject() {
    return this.jsonObject
  }
}
