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
        project: {
          include: {
            step: true,
          },
        },
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
    try {
      await prisma.test.upsert({
        where: {
          id_team_repo_name_step_name_test_name: {
            id_team: id_team,
            repo_name: repo_name,
            step_name: step_name,
            test_name: test_name,
          },
        },
        update: {
          status_passed: status_passed,
          message: message,
          detailed_message: detailed_message,
        },
        create: {
          id_team: id_team,
          repo_name: repo_name,
          step_name: step_name,
          test_name: test_name,
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

  async createStep(
    numOrder: number,
    title: string,
    description: string,
    stepName: string,
    repoName: string,
    testNumber: number
  ) {
    try {
      await prisma.step.create({
        data: {
          num_order: numOrder,
          title: title,
          description: description,
          step_name: stepName,
          repo_name: repoName,
          test_number: testNumber,
        },
      })
    } catch (error) {
      return [500, 'internal_server_error', 'error']
    }

    return [200, 'ok', 'success']
  }

  async deleteStep(repoName: string, stepName: string) {
    try {
      await prisma.step.delete({
        where: {
          repo_name_step_name: {
            repo_name: repoName,
            step_name: stepName,
          },
        },
      })
    } catch (e) {
      return [500, 'internal_server_error', 'error']
    }

    return [200, 'ok', 'success']
  }

  async deleteTest(idTeam: number, repoName: string, stepName: string, testName: string) {
    try {
      await prisma.test.delete({
        where: {
          id_team_repo_name_step_name_test_name: {
            id_team: idTeam,
            repo_name: repoName,
            step_name: stepName,
            test_name: testName,
          },
        },
      })
    } catch (e) {
      return [500, 'internal_server_error', 'error']
    }

    return [200, 'ok', 'success']
  }

  async createTeam(
    teamRepoName: string,
    repoName: string,
    members: Array<string>,
    token: string,
    userDatabaseService: UserDatabaseService
  ) {
    let team
    try {
      team = await prisma.team.create({
        data: {
          team_repo_name: teamRepoName,
          last_commit: null,
          status_project_finished: false,
          finish_project_at: null,
          webhook_secret: token,
          join_project_at: new Date(),
          repo_name: repoName,
        },
      })
    } catch (e) {
      if (e.code === 'P2002' && e.meta && e.meta.target && e.meta.target.includes('team_repo_name')) {
        return [409, 'team_already_exists', 'error']
      } else if (e.code === 'P2003' && e.meta && e.meta.field_name && e.meta.field_name.includes('repo_name')) {
        return [409, 'project_not_exists', 'error']
      }
      return [500, 'internal_server_error', 'error']
    }

    for (let member of members) {
      // get user id from username
      let user = await userDatabaseService.getUserFromUsername(member)
      if (user === null) {
        return [404, 'user_not_found', 'error']
      }
      try {
        await prisma.account_team.create({
          data: {
            id_account: user.id_account,
            id_team: team.id_team,
          },
        })
      } catch (e2) {
        return [500, 'internal_server_error', 'error']
      }
    }
    return [200, 'ok', 'success']
  }
}
