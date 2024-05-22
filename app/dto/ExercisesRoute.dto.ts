import { prisma } from '#config/app';
import { z } from 'zod'

export const ExercisesRouteSchema = z
  .object({
    repo_name: z.string(),
  })
  .required()
  .refine(async (data) => {
    let repoExists = await prisma.project.findFirst({
      where: {
        repo_name: data.repo_name,
      },
    })
    return !!repoExists
  })

export type ExercisesRouteDto = z.infer<typeof ExercisesRouteSchema>;
