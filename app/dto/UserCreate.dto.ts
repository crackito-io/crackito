import { prisma } from '#config/app';
import { z } from 'zod';

export const UserCreateSchema = z
  .object({
    email: z.string().max(255).email(),
    password: z.string().min(8).max(255).regex(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()-+=|{}[\]:;<>,.?\/])/),
    confirmPassword: z.string(), // no check, check if match with password only in refinements
    firstname: z.string().max(50),
    lastname: z.string().max(50),
  })
  .required()
  .refine((data) => data.password === data.confirmPassword)
  .refine(async (data) => {
      let emailAlreadyTaken = await prisma.account.findFirst({
        where: {
          email_address: data.email,
        },
      })
      return !emailAlreadyTaken
    },
    { message: 'mail_already_taken' }
  )

export type UserCreateDto = z.infer<typeof UserCreateSchema>
