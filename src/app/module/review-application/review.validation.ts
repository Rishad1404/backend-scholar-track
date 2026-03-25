import { z } from "zod";

const submitReviewSchema = z.object({
  gpaScore: z
    .number("GPA score must be a number")
    .min(0, "GPA score cannot be negative")
    .max(10, "GPA score cannot exceed 10"),
  essayScore: z
    .number("Essay score must be a number")
    .min(0, "Essay score cannot be negative")
    .max(10, "Essay score cannot exceed 10"),
  financialScore: z
    .number("Financial score must be a number")
    .min(0, "Financial score cannot be negative")
    .max(10, "Financial score cannot exceed 10"),
  criteriaScore: z
    .number("Criteria score must be a number")
    .min(0, "Criteria score cannot be negative")
    .max(10, "Criteria score cannot exceed 10"),
  notes: z
    .string()
    .max(5000, "Notes must not exceed 5000 characters")
    .trim()
    .optional(),
});

const updateReviewSchema = z.object({
  gpaScore: z.number().min(0).max(10).optional(),
  essayScore: z.number().min(0).max(10).optional(),
  financialScore: z.number().min(0).max(10).optional(),
  criteriaScore: z.number().min(0).max(10).optional(),
  notes: z
    .string()
    .max(5000, "Notes must not exceed 5000 characters")
    .trim()
    .optional(),
});

export const ReviewValidation = {
  submitReviewSchema,
  updateReviewSchema,
};