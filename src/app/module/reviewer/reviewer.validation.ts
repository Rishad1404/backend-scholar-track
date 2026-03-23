import z from "zod";

export const addReviewerSchema = z.object({
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
  //   "Password must contain uppercase, lowercase and a number"
  // )
  phone: z.string().min(11).max(15).optional(),
  designation: z.string().max(100).optional(),
  expertise: z.string().max(255).optional(),
});

export const updateReviewerSchema = z.object({
  reviewer: z
    .object({
      name: z.string("Name is required").min(2).max(100).optional(),
      phone: z.string("Phone is required").min(11).max(15).optional(),
      designation: z.string("Designation is required").max(100).optional(),
      expertise: z.string("Expertise is required").max(255).optional(),
    })
    .optional(),
});

export type TUpdateReviewerPayload = z.infer<typeof updateReviewerSchema>;

export type TAddReviewerPayload = z.infer<typeof addReviewerSchema>;
