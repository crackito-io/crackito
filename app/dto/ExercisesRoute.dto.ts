import { z } from 'zod';

export const ExercisesRouteSchema = z
  .object({
    id: z.string().regex(/\d+/g)
  })
  .required();

export type ExercisesRouteDto = z.infer<typeof ExercisesRouteSchema>;