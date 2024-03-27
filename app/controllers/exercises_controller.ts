import { prisma } from "#config/app";
import { HttpContext } from "@adonisjs/core/http";
import { jwtDecode } from "jwt-decode";
import { ExercisesRouteSchema } from "../dto/ExercisesRoute.dto.js";
import { account_exercise } from "@prisma/client";

export default class ExercisesController {
  public async all(ctx: HttpContext) {
    // get user id
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    // get list exercise
    const queryResult = await prisma.account_exercise.findMany({
      where: {
        id_account: jwtToken.id_account,
      },
      orderBy:{
        join_date: 'desc'
      },
      include:{
        exercise: true
      },
    })

    let exerciseList : any[] = []

    queryResult.forEach((el)=>{
        exerciseList.push({
            title: el.exercise.title,
            description: el.exercise.description,
            status: el.archived == false ? "Open" : "Closed",
            status_style: el.archived == false ? "bg-light-primary" : "bg-light-secondary",
            id_exercise: el.exercise.id_exercise
        })
    })


    return ctx.view.render('features/exercise/exercises', {
      exerciseList: exerciseList,
    })
  }

  headerBuilder(account_exercise: account_exercise) : Promise<any>{
    return new Promise(async (resolve, reject)=>{

      const exercise = await prisma.exercise.findUnique({
        where: {
          id_exercise: account_exercise.id_exercise
        }
      })

      resolve({
        title: exercise?.title,
        rank: "?th",
        steps: "?/?",
        last_commit: "? minutes",
        status: account_exercise?.archived ? "Closed" : "Open",
        exercise_id: account_exercise.id_exercise
      })
    })
  }

  public async details(ctx: HttpContext) {
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      ExercisesRouteSchema.parse(ctx.params)
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

    return ctx.view.render('features/exercise/exercise_details')
  }

  public async scoreboard(ctx: HttpContext){
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      ExercisesRouteSchema.parse(ctx.params)
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

    return ctx.view.render('features/exercise/exercise_scoreboard')
  }

  public async helper(ctx: HttpContext){
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      ExercisesRouteSchema.parse(ctx.params)
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

  public async logs(ctx: HttpContext){
    const jwtToken: any = jwtDecode(ctx.request.cookie('jwt'))

    try {
      ExercisesRouteSchema.parse(ctx.params)
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
