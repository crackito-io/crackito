import { prisma } from "#config/app";
import { HttpContext } from "@adonisjs/core/http";
import { jwtDecode } from "jwt-decode";
import { ExercisesRouteSchema } from "../dto/ExercisesRoute.dto.js";
import { team } from "@prisma/client";

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
          }
        },
      },
    })

    // get list exercise
    let exerciseList: any[] = []

    userTeams.forEach((el) => {
      exerciseList.push({
        title: el.team.project.name,
        description: el.team.project.description,
        status: el.team.project.status_open ? 'Open' : 'Closed',
        status_style: el.team.project.status_open ? 'bg-light-primary' : 'bg-light-secondary',
        status_team: el.team.status_project_finished ? 'Finished' : 'In progress',
        status_team_style: el.team.status_project_finished ? 'bg-light-success' : 'bg-light-warning',
        repo_name: el.team.project.repo_name,
      })
    })

    return ctx.view.render('features/exercise/exercises', {
      exerciseList: exerciseList,
    })
  }

  getPrintableTime(timestamp: number) {
    let seconds = timestamp / 1000
    if (seconds < 60) {
      return Math.trunc(seconds) + ' second(s)'
    } else if (seconds < 3600) {
      return Math.trunc(seconds / 60) + ' minute(s)'
    } else {
      return Math.trunc(seconds / 3600) + ' hour(s)'
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

  async getLeaderBoard(currentTeam: team) {
    let leaderboard = await prisma.team.findMany({
      where: {
        project: {
          repo_name: currentTeam.project.repo_name,
        },
      },
      include: {
        project: {
          include: {
            step: true,
          },
        },
        test: true,
        account_team: {
          include: {
            account: true,
          },
        },
      },
    })

    //console.log(leaderboard.find((e) => e.account_team))

    let rLeaderboard = []

    let nbPointsProject = 0
    for (let step of currentTeam.project.step) {
      nbPointsProject += step.test_number * 4
    }

    for (let team of leaderboard) {
      let data = { id_team: team.id_team, teamMembers: [], gainedPoint: 0, maxPoint: nbPointsProject, percentFinished: 0 }

      for (let member of team.account_team) {
        data.teamMembers.push(member.account.Firstname + ' ' + member.account.Lastname)
      }

      // points gained by step
      let gainedPoints = 0
      for (let step of team.project.step) {
        let nbPoints = step.test_number * 4

        let nbPassedTest = 0
        for (let test of team.test) {
          if (test.id_step === step.id_step) {
            nbPassedTest += test.status_passed ? 1 : 0
          }
        }

        let percentPassedTest = nbPassedTest / step.test_number
        gainedPoints += this.pointGainedFunction(percentPassedTest, nbPoints)
        console.log('gain', percentPassedTest, nbPoints, gainedPoints, this.pointGainedFunction(percentPassedTest, nbPoints))
      }

      data.gainedPoint = Math.trunc(gainedPoints)
      data.percentFinished = Math.trunc((gainedPoints / nbPointsProject) * 100)
      rLeaderboard.push(data)
    }

    rLeaderboard.sort((a, b) => b.gainedPoint - a.gainedPoint)

    return rLeaderboard
  }

  async headerBuilder(currentTeam: team, leaderboard: object[]) {
    console.log(leaderboard)
    let rankCurrentTeam = leaderboard.findIndex((e) => e.id_team === currentTeam.id_team) + 1
    let stepNotFinished = new Set()

    for (let test of currentTeam.test) {
      if (!test.status_passed) {
        stepNotFinished.add(test.id_step)
      }
    }
    let totalStepFinished = currentTeam.project.step.length - stepNotFinished.size
    console.log(stepNotFinished, currentTeam.project.step.length, totalStepFinished)
    return {
      title: currentTeam.project.name,
      rank: rankCurrentTeam + 'th',
      steps: totalStepFinished + '/' + currentTeam.project.step.length,
      last_commit: this.getPrintableTime(Date.now() - currentTeam.last_commit.getTime()),
      status: currentTeam.project.status_open,
      status_team: currentTeam.status_project_finished,
      repo_name: currentTeam.project.repo_name,
    }
  }

  async details(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    const accountTeam = await prisma.account_team.findFirst({
      where: {
        id_account: jwtToken.id_account,
        team: {
          repo_name: ctx.params.repo_name,
        },
      },
      include: {
        team: {
          include: {
            test: true,
            project: {
              include: {
                step: true,
              },
            },
          },
        },
      },
    })

    if (accountTeam === null) {
      ctx.response.badRequest({ message: 'You are trying to access an exercise in which you are not registered'})
      return
    }

    let leaderboard = await this.getLeaderBoard(accountTeam.team)

    ctx.view.share({
      ...(await this.headerBuilder(accountTeam.team, leaderboard)),
    })

    return ctx.view.render('features/exercise/exercise_details', { project_description: accountTeam.team.project.description })
  }

  async scoreboard(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    const accountTeam = await prisma.account_team.findFirst({
      where: {
        id_account: jwtToken.id_account,
        team: {
          repo_name: ctx.params.repo_name,
        },
      },
      include: {
        team: {
          include: {
            test: true,
            project: {
              include: {
                step: true,
              },
            },
          },
        },
      },
    })

    if (accountTeam === null) {
      ctx.response.badRequest({ message: 'You are trying to access an exercise in which you are not registered'})
      return
    }

    let leaderboard = await this.getLeaderBoard(accountTeam.team)

    ctx.view.share({
      ...(await this.headerBuilder(accountTeam.team, leaderboard)),
    })

    let userProgress = []

    for (let step of accountTeam.team.project.step) {
      let data = {
        step_description: step.description,
        step_title: step.title,
        step_test_number: step.test_number,
        step_all_tests_passed: true,
        step_tests: [],
      }
      // trier par num_order les steps
      for (let test of accountTeam.team.test) {
        if (test.id_step === step.id_step) {
          if (!test.status_passed) {
            data.step_all_tests_passed = false
          }
          data.step_tests.push({name:test.test_name, message: test.message, detailed_message:test.detailed_message, passed:test.status_passed})
        }
      }

      userProgress.push(data)
    }

    return ctx.view.render('features/exercise/exercise_scoreboard', { project_leaderboard: leaderboard, userProgress: userProgress })
  }













  async helper(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    const account_exercise = await prisma.account_exercise.findUnique({
      where: {
        id_account_id_exercise: {
          id_account: parseInt(jwtToken.id_account),
          id_exercise: parseInt(ctx.params['id'])
        }
      }
    })

    if (account_exercise == null) {
      ctx.response.badRequest({ message: 'You are trying to access an exercise in which you are not registered'})
      return
    }

    ctx.view.share({
      ...await this.headerBuilder(account_exercise),
    })

    return ctx.view.render('features/exercise/exercise_helper')
  }

  async logs(ctx: HttpContext){
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      await ExercisesRouteSchema.parseAsync(ctx.params)
    } catch (error) {
      ctx.response.badRequest({ message: 'Params validation failed', error: error })
      return
    }

    const account_exercise = await prisma.account_exercise.findUnique({
      where: {
        id_account_id_exercise: {
          id_account: parseInt(jwtToken.id_account),
          id_exercise: parseInt(ctx.params['id'])
        }
      }
    })

    if (account_exercise == null) {
      ctx.response.badRequest({ message: 'You are trying to access an exercise in which you are not registered'})
      return
    }

    ctx.view.share({
      ...await this.headerBuilder(account_exercise),
    })

    return ctx.view.render('features/exercise/exercise_logs')
  }
}
