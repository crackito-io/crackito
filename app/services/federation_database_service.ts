import { prisma } from '#config/app'

export default class FederationDatabaseService {
  static instances: { [key: number]: UserDatabaseService }
  userIdOrganization: number

  constructor() {
    this.userIdOrganization = -1
  }

  async setUserIdOrganization(userIdOrganization: number) {
    this.userIdOrganization = userIdOrganization
  }

  async getAllFederations() {
    if (this.userIdOrganization === -1) {
      return [500, 'server_error', 'error', null]
    }
    const federationsInOrganization = await prisma.federation.findMany({
      where: {
        id_organization: {
          equals: this.userIdOrganization,
        },
      },
      include: {
        federation_account: true,
      },
    })

    return [200, 'user_list_success', 'success', federationsInOrganization]
  }
}
