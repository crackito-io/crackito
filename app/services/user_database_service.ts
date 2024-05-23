import { prisma } from '#config/app'
import bcrypt from 'bcrypt'
import { account } from '@prisma/client'

export default class UserDatabaseService {
  async getUserFromId(id_account: number) {
    const user = await prisma.account.findFirst({
      where: {
        id_account: id_account,
      },
    })

    return user
  }

  async usernameAlreadyExists(username: string): Promise<account | null> {
    const user: account | null = await prisma.account.findFirst({
      where: {
        username: username,
      },
    })

    return user
  }

  async createUser(currentUserOrganizationId: number, email_address: string, password: string, firstname: string, lastname: string, username: string): Promise<[number, string, string, account | null]> {
    // create user in database
    let user: account
    try {
      user = await prisma.account.create({
        data: {
          email_address: email_address,
          password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
          Firstname: firstname,
          Lastname: lastname,
          id_organization: currentUserOrganizationId,
          username: username,
        },
      })
    } catch (error) {
      return [500, 'internal_server_error', 'error', null]
    }

    return [200, 'user_create_done_success', 'success', user]
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
