import { prisma } from '#config/app'

export default class FederationDatabaseService {
  async getAllFederations(userIdOrganization: number) {
    const federationsInOrganization = await prisma.federation.findMany({
      where: {
        id_organization: {
          equals: userIdOrganization,
        },
      },
      include: {
        federation_account: true,
      },
    })

    return [200, 'user_list_success', 'success', federationsInOrganization]
  }
}
