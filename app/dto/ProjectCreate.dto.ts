import { z } from 'zod'

// Fonction pour vérifier le format ISO 8601 avec ou sans secondes
const isValidISODateWithSeconds = (dateStr: string) => {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/
  return isoRegex.test(dateStr)
}

// Fonction pour convertir la date en ISO 8601 complet
const convertToFullISO = (dateStr: string): string => {
  if (!dateStr.includes(':', 19)) {
    dateStr = `${dateStr}:00`
  }
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date format')
  }
  return date.toISOString()
}

export const ProjectCreateSchema = z.object({
  name: z.string().max(50),
  description: z.string().max(255).nullish(),
  template: z.string().nullish(),
  limit_datetime: z
    .string()
    .nullish()
    .transform((val) => (val ? convertToFullISO(val) : val))
    .refine((val) => !val || isValidISODateWithSeconds(val), {
      message: 'Invalid date format',
    })
    .refine((val) => !val || new Date(val) > new Date(), {
      message: 'limit_datetime must be in the future',
    }),
})

export type ProjectCreateDto = z.infer<typeof ProjectCreateSchema>
