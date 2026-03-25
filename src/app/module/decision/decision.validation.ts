import { z } from "zod";

const makeDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"], {
    message: "Decision must be APPROVED or REJECTED",
  }),
  remarks: z
    .string()
    .max(5000, "Remarks must not exceed 5000 characters")
    .trim()
    .optional(),
});

export const DecisionValidation = {
  makeDecisionSchema,
};