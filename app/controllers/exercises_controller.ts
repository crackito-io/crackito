import { prisma } from "#config/app";
import { HttpContext } from "@adonisjs/core/http";
import { jwtDecode } from "jwt-decode";
import { ExercisesRouteSchema } from "../dto/ExercisesRoute.dto.js";
import { Prisma, team } from "@prisma/client";
import { project } from "@prisma/client";
import logger from "@adonisjs/core/services/logger";
import ProjectDatabaseService from "#services/project_database_service";
import { inject } from "@adonisjs/core";

export type LeaderBoardElement = {
  id_team: number
  teamMembers: Array<string>
  gainedPoint: number
  maxPoint: number
  percentFinished: number
}

export type LeaderBoard = Array<LeaderBoardElement>

type ProjectWithRelations = Prisma.projectGetPayload<{
  include: {
    step: true
    team: {
      include: {
        test: true
        account_team: {
          include: {
            account: true
          }
        }
      }
    }
  }
}>

type TeamWithRelations = Prisma.teamGetPayload<{
  include: {
    test: true
    account_team: {
      include: {
        account: true
      }
    }
  }
}>

export type ProjectInfo = {
  currentProject: ProjectWithRelations
  leaderboard: LeaderBoard
}

export type Exercise = {
  title: string | null
  description: string | null
  status_open: boolean
  status_team_finished: boolean | null
  repo_name: string
}

export type ExerciseList = Array<Exercise>

export type ExerciseOwn = {
  title: string | null
  description: string | null
  status_open: boolean
  repo_name: string
}

export type ExerciseOwnList = Array<ExerciseOwn>

export default class ExercisesController {
  @inject()
  async patchTitleDescription(ctx: HttpContext, projectDatabaseService: ProjectDatabaseService) {
    let body = ctx.request.body()

    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    let conform = await this.checkConformRequest(ctx, idAccount)
    if (!conform) {
      return ctx.response.badRequest({ message: 'Not conform' })
    }

    let projectInfo = await this.getLeaderBoard(ctx.params.repo_name)
    if (projectInfo === null) {
      logger.info({ tag: '#15F411' }, 'Project does not exist, redirect to the previous page')
      return ctx.response.badRequest({ message: ctx.i18n.t('translate.project_not_exists') })
    }

    let admin: boolean = idAccount === projectInfo.currentProject.id_account

    if (admin) {
      let edit = await projectDatabaseService.editTitleAndDescriptionStep(
        ctx.params.repo_name,
        body.step_name,
        body.title,
        body.description
      )
      if (!edit) {
        logger.info({ tag: '#BCD4FF' }, 'Error while editing title/description of project in database')
        return ctx.response.internalServerError({ status_code: 500, status_message: ctx.i18n.t('translate.internal_server_error'), title: ctx.i18n.t('translate.error') })
      }
      logger.info({ tag: '#2DF441' }, 'Rename project properties success')
      return ctx.response.ok({ status_code: 200, status_message: ctx.i18n.t('translate.step_updated_success'), title: ctx.i18n.t('translate.success') })
    } else {
      logger.info({ tag: '#ACF411' }, 'Not allowed to rename project properties')
      return ctx.response.badRequest({ status_code: 401, status_message: ctx.i18n.t('translate.not_admin'), title: ctx.i18n.t('translate.error') })
    }
  }
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
    let exerciseList: ExerciseList = []

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

    let exerciseOwnedList: ExerciseOwnList = []

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

    if (projectObject === null) {
      return null
    }

    let projectInfo: ProjectInfo = { currentProject: projectObject, leaderboard: [] }

    for (let projectTeam of projectInfo.currentProject.team) {
      let data: LeaderBoardElement = {
        id_team: projectTeam.id_team,
        teamMembers: [],
        gainedPoint: 0,
        maxPoint: 0,
        percentFinished: 0,
      }

      for (let member of projectTeam.account_team) {
        data.teamMembers.push(member.account.Firstname + ' ' + member.account.Lastname)
      }

      // points gained by step
      let gainedPoints = 0
      for (let step of projectInfo.currentProject.step) {
        let nbTest = 0
        let nbPassedTest = 0
        for (let test of projectTeam.test) {
          if (test.step_name === step.step_name) {
            nbTest++
            nbPassedTest += test.status_passed ? 1 : 0
          }
        }

        if (nbTest === 0) {
          continue
        }

        let nbPoints = nbTest * 4
        data.maxPoint += nbPoints

        let percentPassedTest = nbPassedTest / nbTest
        gainedPoints += this.pointGainedFunction(percentPassedTest, nbPoints)
      }

      data.gainedPoint = Math.trunc(gainedPoints)
      data.percentFinished = Math.trunc((gainedPoints / data.maxPoint) * 100)
      projectInfo.leaderboard.push(data)
    }

    projectInfo.leaderboard.sort(
      (a: LeaderBoardElement, b: LeaderBoardElement) => b.gainedPoint - a.gainedPoint
    )

    return projectInfo
  }

  async headerBuilder(currentTeam: TeamWithRelations, currentProject: ProjectWithRelations, leaderboard: LeaderBoard, ctx: HttpContext, isAdmin: boolean) {
    if (!currentTeam) {
      if (isAdmin) {
        return {
          title: currentProject.name,
          rank: '-',
          steps: '-/' + currentProject.step.length,
          last_commit: '-',
          status: currentProject.status_open,
          status_team: true,
          repo_name: currentProject.repo_name,
        }
      }
      logger.info({ tag: '#4411DA' }, 'User not involved in exercise, or not owner of the exercise, redirect to the previous page')
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.not_in_exercise_error'),
      })
      return
    }

    let rankCurrentTeam = leaderboard.findIndex((e) => e.id_team === currentTeam.id_team) + 1
    let stepNotFinished = new Set()

    for (let test of currentTeam.test) {
      if (!test.status_passed) {
        stepNotFinished.add(test.step_name)
      }
    }
    let totalStepFinished = currentProject.step.length - stepNotFinished.size
    return {
      title: currentProject.name,
      rank: rankCurrentTeam,
      steps: totalStepFinished + '/' + currentProject.step.length,
      last_commit: currentTeam.last_commit
        ? this.getPrintableTime(Date.now() - currentTeam.last_commit.getTime(), ctx)
        : '-',
      status: currentProject.status_open,
      status_team: totalStepFinished === currentProject.step.length,
      repo_name: currentProject.repo_name,
    }
  }

  async checkConformRequest(ctx: HttpContext, idAccount: number | null) {
    if (idAccount === null) {
      logger.info({ tag: '#11AADA' }, 'JWT Token idAccount attributes is null, redirect to the previous page')
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.unknown_error'),
      })
      return false
    }

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      logger.info({ tag: '#1344F1' }, 'Params are not conform, exercice does not exist, redirect to the previous page')
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.exercise_not_exist_error'),
      })
      return false
    }
    return true
  }

  async details(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    let conform = await this.checkConformRequest(ctx, idAccount)
    if (!conform) {
      return ctx.response.redirect().back()
    }

    let projectInfo = await this.getLeaderBoard(ctx.params.repo_name)
    if (projectInfo === null) {
      logger.info({ tag: '#15FF11' }, 'Project does not exist, redirect to the previous page')
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.exercise_not_exist_error'),
      })
      return ctx.response.redirect().back()
    }
    let currentTeam = projectInfo.currentProject.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    let admin: boolean = idAccount === projectInfo.currentProject.id_account

    let header = await this.headerBuilder(currentTeam, projectInfo.currentProject, projectInfo.leaderboard, ctx, admin)
    if (!header) {
      return ctx.response.redirect().back()
    }

    ctx.view.share({ ...header })

    return ctx.view.render('features/exercise/exercise_details', { project_description: projectInfo.currentProject.description })
  }

  async scoreboard(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    let conform = await this.checkConformRequest(ctx, idAccount)
    if (!conform) {
      return ctx.response.redirect().back()
    }

    let projectInfo = await this.getLeaderBoard(ctx.params.repo_name)
    if (projectInfo === null) {
      logger.info({ tag: '#15FF11' }, 'Project does not exist, redirect to the previous page')
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.exercise_not_exist_error'),
      })
      return ctx.response.redirect().back()
    }
    let currentTeam = projectInfo.currentProject.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    let admin: boolean = idAccount === projectInfo.currentProject.id_account

    let header = await this.headerBuilder(currentTeam, projectInfo.currentProject, projectInfo.leaderboard, ctx, admin)
    if (!header) {
      return ctx.response.redirect().back()
    }

    ctx.view.share({ ...header })

    let userProgress = []

    let projectSteps = projectInfo.currentProject.step.sort((a, b) => a.num_order - b.num_order)

    for (let step of projectSteps) {
      let data = {
        step_name: step.step_name,
        step_description: step.description,
        step_title: step.title,
        step_test_number: 0,
        step_all_tests_passed: true,
        step_tests: [],
      }
      if (currentTeam) {
        for (let test of currentTeam.test) {
          if (test.step_name === step.step_name) {
            data.step_test_number++
            if (!test.status_passed) {
              data.step_all_tests_passed = false
            }
            data.step_tests.push({name:test.test_name, message: test.message, detailed_message:test.detailed_message, passed:test.status_passed})
          }
        }
      }

      userProgress.push(data)
    }

    return ctx.view.render('features/exercise/exercise_scoreboard', { project_leaderboard: projectInfo.leaderboard, userProgress: userProgress, viewAsAdmin: admin })
  }

  async helper(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    let conform = await this.checkConformRequest(ctx, idAccount)
    if (!conform) {
      return ctx.response.redirect().back()
    }

    let projectInfo = await this.getLeaderBoard(ctx.params.repo_name)
    if (projectInfo === null) {
      logger.info({ tag: '#15FF11' }, 'Project does not exist, redirect to the previous page')
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.exercise_not_exist_error'),
      })
      return ctx.response.redirect().back()
    }
    let currentTeam = projectInfo.currentProject.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    let admin: boolean = idAccount === projectInfo.currentProject.id_account

    let header = await this.headerBuilder(currentTeam, projectInfo.currentProject, projectInfo.leaderboard, ctx, admin)
    if (!header) {
      return ctx.response.redirect().back()
    }

    ctx.view.share({ ...header })

    return ctx.view.render('features/exercise/exercise_helper')
  }

  async logs(ctx: HttpContext){
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    const idAccount = jwtToken.id_account

    let conform = await this.checkConformRequest(ctx, idAccount)
    if (!conform) {
      return ctx.response.redirect().back()
    }

    let projectInfo = await this.getLeaderBoard(ctx.params.repo_name)
    if (projectInfo === null) {
      logger.info({ tag: '#15FF11' }, 'Project does not exist, redirect to the previous page')
      ctx.session.flash('notifications', {
        type: 'danger',
        title: ctx.i18n.t('translate.error'),
        message: ctx.i18n.t('translate.exercise_not_exist_error'),
      })
      return ctx.response.redirect().back()
    }
    let currentTeam = projectInfo.currentProject.team.find((e) =>
      e.account_team.find((f) => f.id_account === idAccount)
    )

    let admin: boolean = idAccount === projectInfo.currentProject.id_account

    let header = await this.headerBuilder(currentTeam, projectInfo.currentProject, projectInfo.leaderboard, ctx, admin)
    if (!header) {
      return ctx.response.redirect().back()
    }

    ctx.view.share({ ...header })

    return ctx.view.render('features/exercise/exercise_logs')
  }
}
