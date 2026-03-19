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
