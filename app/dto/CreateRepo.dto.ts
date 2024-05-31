import { z } from 'zod'

export const CreateRepoSchema = z.object({
  name: z.string().max(50),
  description: z.string().max(255),
  template: z.string().nullish(),
  limit_datetime: z.string().datetime(),
  owner_id: z.number(),
  token_project: z.string(),
})

export type CreateRepoDto = z.infer<typeof CreateRepoSchema>
