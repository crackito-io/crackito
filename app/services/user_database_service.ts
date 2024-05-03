import { prisma } from '#config/app'
import bcrypt from 'bcrypt'

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

  async createUser(email_address: string, password: string, confirmPassword: string, firstname: string, lastname: string): Promise<[number, string, string, object | null]> {
    // create user in database
    let user = await prisma.account.create({
      data: {
        email_address: email_address,
        password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
        Firstname: firstname,
        Lastname: lastname,
        id_organization: this.userIdOrganization,
      },
    })

    return [200, 'user_create_done_success', 'success', user]
  }
}
