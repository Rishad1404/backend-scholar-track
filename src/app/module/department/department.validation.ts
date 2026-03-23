import z from "zod";

export const createDepartmentSchema = z.object({
  name: z
    .string("Department name is required")
    .min(7, "Name must be at least 7 characters")
    .max(255, "Name must be at most 255 characters"),
  universityId: z.string("University ID is required").optional(),
});

export const updateDepartmentSchema = z.object({
  department: z
    .object({
      name: z
        .string("Name must be a string")
        .min(7, "Name must be at least 7 characters")
        .max(255, "Name must be at most 255 characters")
        .optional(),
    })
    .optional(),
});

export type TCreateDepartmentPayload = z.infer<typeof createDepartmentSchema>;
export type TUpdateDepartmentPayload = z.infer<typeof updateDepartmentSchema>;
