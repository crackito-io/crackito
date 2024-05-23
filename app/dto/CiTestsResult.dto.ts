import { z } from 'zod'

const testSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  error: z.string().optional(),
  message: z.string().optional(),
})

const stepSchema = z.object({
  name: z.string(),
  tests: z.array(testSchema).min(1),
})

export const CiTestsResultSchema = z.object({
  token: z.string(),
  steps: z.array(stepSchema).min(1),
})

export type CiTestsResultDto = z.infer<typeof CiTestsResultSchema>
