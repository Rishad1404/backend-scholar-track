import { z } from "zod";

export const createAcademicTermSchema = z.object({
  name: z
    .string("Academic term name is required")
    .min(5, "Name cannot be empty")
    .max(20, "Name is too long"),
  universityId: z.string().uuid("Invalid University ID format").optional(),
});

export const updateAcademicTermSchema = z.object({
  name: z.string().min(5, "Name cannot be empty").max(20, "Name is too long").optional(),
});

export type TCreateAcademicTermPayload = z.infer<typeof createAcademicTermSchema>;
export type TUpdateAcademicTermPayload = z.infer<typeof updateAcademicTermSchema>;
