import { z } from "zod";

export const registerUniversityAdminSchema = z.object({
  // Admin personal info
  name: z
    .string("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100),
  email: z.email("Invalid email address"),
  password: z
    .string("Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase and a number",
    ),

  // University info
  universityName: z
    .string("University name is required")
    .min(10, "University name must be at least 10 characters")
    .max(255),

  website: z.url().optional(),

  phone: z.string("Contact number is required").min(11, "Contact number must be at least 11 characters").max(15,"Contact number must be at most 15 characters"),

  designation: z.string().max(100).optional(),
});

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

export type TRegisterUniversityAdminPayload = z.infer<
  typeof registerUniversityAdminSchema
>;
export type TUpdateUniversityPayload = z.infer<typeof updateUniversitySchema>;
export type TApproveUniversityPayload = z.infer<typeof approveUniversitySchema>;
export type TSuspendUniversityPayload = z.infer<typeof suspendUniversitySchema>;
