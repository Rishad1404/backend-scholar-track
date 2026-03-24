import z from "zod";

export const updateUniversitySchema = z.object({
  university: z
    .string()
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    })
    .pipe(
      z
        .object({
          name: z
            .string("Name must be a string")
            .min(5, "Name must be at least 5 characters")
            .max(255)
            .optional(),
          website: z
            .url("Website must be a valid URL")
            .optional(),
        })
    )
    .optional(),
});

export const updateUniversityStatusSchema = z.object({
  status: z.enum(["APPROVED", "SUSPENDED", "PENDING"], {
    message: "Status must be APPROVED, SUSPENDED or PENDING",
  }),
});

export type TUpdateUniversityPayload = z.infer<typeof updateUniversitySchema>;
export type TUpdateUniversityStatusPayload = z.infer<typeof updateUniversityStatusSchema>;