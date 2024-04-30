import { prisma } from '#config/app'

export default class UserDatabaseService {
  static instances: { [key: number]: UserDatabaseService }
  userIdOrganization: number

  constructor(userIdOrganization: number) {
    this.userIdOrganization = userIdOrganization
  }

  static getInstance(idOrganization: number) {
    if (UserDatabaseService.instances === undefined) {
      UserDatabaseService.instances = {}
      UserDatabaseService.instances[idOrganization] = new UserDatabaseService(idOrganization)
    } else if (!(idOrganization in UserDatabaseService.instances)) {
      UserDatabaseService.instances[idOrganization] = new UserDatabaseService(idOrganization)
    }

    return UserDatabaseService.instances[idOrganization]
  }

  async getUserFromId(id_account: number) {
    const user = await prisma.account.findFirst({
      where: {
        id_account: id_account,
      },
    })

    return user
  }

  async getUserOrganization(user): Promise<number | null> {
    return user?.id_organization ?? null
  }

  async deleteUser(id_account: number): Promise<[number, string, string]> {
    // check user does not exist
    let user = await this.getUserFromId(id_account)
    if (user === null) {
      return [404, 'user_not_found_on_delete_error', 'error']
    }

    // check user not in current user organization
    let userOrganization = await this.getUserOrganization(user)
    if (userOrganization !== this.userIdOrganization) {
      return [403, 'user_not_in_organization_on_delete_error', 'error']
    }

    // completely delete user
    await prisma.account.delete({
      where: {
        id_account: id_account,
      },
    })
    return [200, 'user_delete_done_success', 'success']
  }
}
