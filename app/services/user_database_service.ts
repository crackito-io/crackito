import { prisma } from '#config/app'

export default class UserDatabaseService {
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

  async deleteUser(currentUserId: number, currentUserOrganizationId: number, id_account: number): Promise<[number, string, string]> {
    // check self deletion
    if (id_account === currentUserId) {
      return [403, 'user_your_self', 'error']
    }

    // check user does not exist
    let user = await this.getUserFromId(id_account)
    if (user === null) {
      return [404, 'user_not_found_on_delete_error', 'error']
    }

    // check user not in current user organization
    let userOrganization = await this.getUserOrganization(user)
    if (userOrganization !== currentUserOrganizationId) {
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
