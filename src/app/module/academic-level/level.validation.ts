import { z } from "zod";

export const createAcademicLevelSchema = z.object({
  name: z
    .string("Academic level name is required")
    .min(5, "Name cannot be empty")
    .max(20, "Name is too long"),
  universityId: z.uuid("Invalid University ID format").optional(),
});

export const updateAcademicLevelSchema = z.object({
  name: z
    .string()
    .min(5, "Name cannot be empty")
    .max(20, "Name is too long")
    .optional(),
});

export type TCreateAcademicLevelPayload = z.infer<typeof createAcademicLevelSchema>;
export type TUpdateAcademicLevelPayload = z.infer<typeof updateAcademicLevelSchema>;