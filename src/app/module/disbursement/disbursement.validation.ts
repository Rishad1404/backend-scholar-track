
import { z } from "zod";

const createDisbursementSchema = z.object({
  applicationId: z.uuid("Invalid application ID"),
});

const processDisbursementSchema = z.object({
  action: z.enum(["PROCESS", "COMPLETE", "FAIL"], {
    message: "Action must be PROCESS, COMPLETE, or FAIL",
  }),
  remarks: z
    .string()
    .max(2000, "Remarks must not exceed 2000 characters")
    .trim()
    .optional(),
});

export const DisbursementValidation = {
  createDisbursementSchema,
  processDisbursementSchema,
};