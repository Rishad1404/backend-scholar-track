import z from "zod";

export const updateAdminZodSchema = z.object({
  admin: z
    .object({
      name: z.string("Name must be a string").optional(),
      profilePhoto: z.url("Profile photo must be a valid URL").optional(),
      phone: z
        .string("Phone must be a string")
        .min(11, "Phone must be at least 11 characters")
        .max(15, "Phone must be at most 15 characters")
        .optional(),
      designation: z
        .string("Designation must be a string")
        .max(100, "Designation must be at most 100 characters")
        .optional(),
      isOwner: z.boolean("isOwner must be a boolean").optional(),
    })
    .optional(),
});

export type TUpdateAdminPayload = z.infer<typeof updateAdminZodSchema>;



// -------------------------------------------------------------Admin to University

export const addAdminToUniversitySchema = z.object({
  name: z
    .string("Name is required")
    .min(5, "Name must be at least 5 characters")
    .max(100),
  email: z.email("Invalid email address"),
  password: z
    .string("Password is required")
    .min(8, "Password must be at least 8 characters"),
  // .regex(
  //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  //   "Password must contain uppercase, lowercase and a number",
  // )
  phone: z
    .string("Contact number is required")
    .min(11, "Contact number must be at least 11 characters")
    .max(15, "Contact number must be at most 15 characters"),

  designation: z
    .string("Designation is required")
    .max(100, "Designation must be at most 100 characters")
    .optional(),
});

export type TAddAdminToUniversityPayload = z.infer<typeof addAdminToUniversitySchema>;
