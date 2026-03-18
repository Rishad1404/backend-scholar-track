import { z } from "zod";



export const updateUniversitySchema = z.object({
  name: z.string().min(3).max(255).optional(),
  website: z.url(),
});

export const approveUniversitySchema = z.object({
  universityId: z.uuid("Invalid university ID"),
});
export const suspendUniversitySchema = z.object({
  universityId: z.uuid("Invalid university ID"),

  reason: z
    .string("Reason is required")
    .min(10, "Please provide a proper reason")
    .max(500),
});


export type TUpdateUniversityPayload = z.infer<typeof updateUniversitySchema>;
export type TApproveUniversityPayload = z.infer<typeof approveUniversitySchema>;
export type TSuspendUniversityPayload = z.infer<typeof suspendUniversitySchema>;
