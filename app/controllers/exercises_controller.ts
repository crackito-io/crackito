import { prisma } from "#config/app";
import { HttpContext } from "@adonisjs/core/http";
import { jwtDecode } from "jwt-decode";
import { ExercisesRouteSchema } from "../dto/ExercisesRoute.dto.js";
import { team } from "@prisma/client";
import { project } from "@prisma/client";

export default class ExercisesController {
  async all(ctx: HttpContext) {
    // get user id
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    // get list user team
    const userTeams = await prisma.account_team.findMany({
      where: {
        id_account: jwtToken.id_account,
      },
      orderBy: {
        team: {
          join_project_at: 'desc',
        },
      },
      include: {
        team: {
          include: {
            project: true,
          },
        },
      },
    })

    // get list exercise
    let exerciseList: object[] = []

    userTeams.forEach((el) => {
      exerciseList.push({
        title: el.team.project.name,
        description: el.team.project.description,
        status_open: el.team.project.status_open,
        status_team_finished: el.team.status_project_finished,
        repo_name: el.team.project.repo_name,
      })
    })

    // get exercises owned by user
    const exerciseOwned = await prisma.project.findMany({
      where: {
        id_account: jwtToken.id_account,
      },
      orderBy: {
        end_time: 'asc',
      },
    })

    let exerciseOwnedList: object[] = []

    exerciseOwned.forEach((e) => {
      exerciseOwnedList.push({
        title: e.name,
        description: e.description,
        status_open: e.status_open,
        repo_name: e.repo_name,
      })
    })

    return ctx.view.render('features/exercise/exercises', {
      exerciseList: exerciseList,
      exerciseOwnedList: exerciseOwnedList,
    })
  }

  getPrintableTime(timestamp: number, ctx: HttpContext) {
    let seconds = timestamp / 1000
    if (seconds < 60) {
      return Math.trunc(seconds) + ' ' + ctx.i18n.t('translate.seconds')
    } else if (seconds < 3600) {
      return Math.trunc(seconds / 60) + ' ' + ctx.i18n.t('translate.minutes')
    } else {
      return Math.trunc(seconds / 3600) + ' ' + ctx.i18n.t('translate.hours')
    }
  }

  pointGainedFunction(t: number, totalPoints: number) {
    let x0 = 0
    let x1 = 0.9 * totalPoints
    let x2 = 0.4 * totalPoints
    let x3 = totalPoints
    return Math.trunc(
      (1 - t) * ((1 - t) * ((1 - t) * x0 + t * x1) + t * ((1 - t) * x1 + t * x2)) +
        t * ((1 - t) * ((1 - t) * x1 + t * x2) + t * ((1 - t) * x2 + t * x3))
    )
  }

  async getLeaderBoard(repo_name: string) {
    let projectObject = await prisma.project.findFirst({
      where: {
        repo_name: repo_name,
      },
      include: {
        step: true,
        team: {
          include: {
            test: true,
            account_team: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    })

    let project = { project: projectObject, leaderboard: [] }

    let nbPointsProject = 0
    for (let step of project.project.step) {
      nbPointsProject += step.test_number * 4
    }

    for (let team of project.project.team) {
      let data = { id_team: team.id_team, teamMembers: [], gainedPoint: 0, maxPoint: nbPointsProject, percentFinished: 0 }

      for (let member of team.account_team) {
        data.teamMembers.push(member.account.Firstname + ' ' + member.account.Lastname)
      }

      // points gained by step
      let gainedPoints = 0
      for (let step of project.project.step) {
        let nbPoints = step.test_number * 4

        let nbPassedTest = 0
        for (let test of team.test) {
          if (test.id_step === step.id_step) {
            nbPassedTest += test.status_passed ? 1 : 0
          }
        }

        let percentPassedTest = nbPassedTest / step.test_number
        gainedPoints += this.pointGainedFunction(percentPassedTest, nbPoints)
      }

      data.gainedPoint = Math.trunc(gainedPoints)
      data.percentFinished = Math.trunc((gainedPoints / nbPointsProject) * 100)
      project.leaderboard.push(data)
    }

    project.leaderboard.sort((a, b) => b.gainedPoint - a.gainedPoint)

    return project
  }

  async headerBuilder(currentTeam: team, project: project, leaderboard: object[], ctx: HttpContext, idAccount: number) {
    if (!currentTeam) {
      console.log(idAccount, project.id_account)
      if (idAccount === project.id_account) {
        return {
          title: project.name,
          rank: '-',
          steps: '-/' + project.step.length,
          last_commit: '-',
          status: project.status_open,
          status_team: true,
          repo_name: project.repo_name,
        }
      }
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.not_in_exercise_error'),
      })
      return ctx.response.redirect().back()
    }

    let rankCurrentTeam = leaderboard.findIndex((e) => e.id_team === currentTeam.id_team) + 1
    let stepNotFinished = new Set()

    for (let test of currentTeam.test) {
      if (!test.status_passed) {
        stepNotFinished.add(test.id_step)
      }
    }
    let totalStepFinished = project.step.length - stepNotFinished.size
    return {
      title: project.name,
      rank: rankCurrentTeam,
      steps: totalStepFinished + '/' + project.step.length,
      last_commit: this.getPrintableTime(Date.now() - currentTeam.last_commit.getTime(), ctx),
      status: project.status_open,
      status_team: currentTeam.status_project_finished,
      repo_name: project.repo_name,
    }
  }

  async details(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    if (idAccount === null) {
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.unknown_error'),
      })
      return ctx.response.redirect().back()
    }

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    let project = await this.getLeaderBoard(ctx.params.repo_name)
    let currentTeam = project.project.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    ctx.view.share({ ...(await this.headerBuilder(currentTeam, project.project, project.leaderboard, ctx, idAccount)) })

    return ctx.view.render('features/exercise/exercise_details', { project_description: project.project.description })
  }

  async scoreboard(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    if (idAccount === null) {
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.unknown_error'),
      })
      return ctx.response.redirect().back()
    }

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    let project = await this.getLeaderBoard(ctx.params.repo_name)
    let currentTeam = project.project.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    ctx.view.share({ ...(await this.headerBuilder(currentTeam, project.project, project.leaderboard, ctx, idAccount)) })

    // view as project owner
    if (!currentTeam) {
      return ctx.view.render('features/exercise/exercise_scoreboard', { project_leaderboard: project.leaderboard, userProgress: null })
    }

    let userProgress = []

    let projectSteps = project.project.step.sort((a, b) => a.num_order - b.num_order)

    for (let step of projectSteps) {
      let data = {
        step_description: step.description,
        step_title: step.title,
        step_test_number: step.test_number,
        step_all_tests_passed: true,
        step_tests: [],
      }
      for (let test of currentTeam.test) {
        if (test.id_step === step.id_step) {
          if (!test.status_passed) {
            data.step_all_tests_passed = false
          }
          data.step_tests.push({name:test.test_name, message: test.message, detailed_message:test.detailed_message, passed:test.status_passed})
        }
      }

      userProgress.push(data)
    }

    return ctx.view.render('features/exercise/exercise_scoreboard', { project_leaderboard: project.leaderboard, userProgress: userProgress })
  }

  async helper(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    if (idAccount === null) {
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.unknown_error'),
      })
      return ctx.response.redirect().back()
    }

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    let project = await this.getLeaderBoard(ctx.params.repo_name)
    let currentTeam = project.project.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    ctx.view.share({ ...(await this.headerBuilder(currentTeam, project.project, project.leaderboard, ctx, idAccount)) })

    return ctx.view.render('features/exercise/exercise_helper')
  }

  async logs(ctx: HttpContext){
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    if (idAccount === null) {
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.unknown_error'),
      })
      return ctx.response.redirect().back()
    }

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    let project = await this.getLeaderBoard(ctx.params.repo_name)
    let currentTeam = project.project.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    ctx.view.share({ ...(await this.headerBuilder(currentTeam, project.project, project.leaderboard, ctx, idAccount)) })

    return ctx.view.render('features/exercise/exercise_logs')
  }
}
