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
}
