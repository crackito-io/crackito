import { prisma } from '#config/app'

export default class ProjectDatabaseService {
  async getProjectFromRepoName(repo_name: string) {
    const user = await prisma.project.findFirst({
      where: {
        repo_name: repo_name,
      },
    })

    return user
  }

  async getTeamFromToken(token: string) {
    let team = await prisma.team.findFirst({
      where: {
        webhook_secret: token,
      },
      include: {
        test: true,
      },
    })
    return team
  }

  async getTeamFromTeamRepoName(teamRepoName: string) {
    return await prisma.team.findFirst({
      where: {
        team_repo_name: teamRepoName,
      },
    })
  }

  async updateTestFromTeam(
    id_team: number,
    repo_name: string,
    step_name: string,
    test_name: string,
    status_passed: boolean,
    message: string,
    detailed_message: string
  ): Promise<boolean> {
    // everything is inserted when we trigger the pipeline for once
    // we are sure this exists, we do not insert if update does not work
    // if update does not work, it's a server error
    try {
      await prisma.test.update({
        where: {
          id_team_repo_name_step_name_test_name: {
            id_team: id_team,
            repo_name: repo_name,
            step_name: step_name,
            test_name: test_name,
          },
        },
        data: {
          status_passed: status_passed,
          message: message,
          detailed_message: detailed_message,
        },
      })
    } catch (error) {
      return false
    }

    return true
  }
}
