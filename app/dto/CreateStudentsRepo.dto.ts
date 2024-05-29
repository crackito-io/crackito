import { z } from 'zod'

const ProtectedSchema = z.object({
  branch: z.string(),
  files: z.array(z.string()),
})

export const CreateStudentsRepoSchema = z.object({
  name: z.string(),
  webhook_url: z.string(),
  teams: z.array(z.array(z.string())),
  protected: ProtectedSchema,
})

export type CreateStudentsRepoDto = z.infer<typeof CreateStudentsRepoSchema>
