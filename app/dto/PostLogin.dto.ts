import { z } from 'zod';

export const PostLoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string(),
  })
  .required();

export type PostLoginDto = z.infer<typeof PostLoginSchema>;