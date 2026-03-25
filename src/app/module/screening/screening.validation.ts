// src/app/modules/screening/screening.validation.ts

import { z } from "zod";

const screenApplicationSchema = z.object({
  passed: z.boolean("Passed must be a boolean value"),
  comment: z
    .string()
    .max(5000, "Comment must not exceed 5000 characters")
    .trim()
    .optional(),
});

export const ScreeningValidation = {
  screenApplicationSchema,
};