import { z } from "zod";
import { DocumentType } from "../../../generated/prisma/enums";

const documentTypeValues = Object.values(DocumentType) as [
  string,
  ...string[],
];

const createApplicationSchema = z.object({
  scholarshipId: z.uuid("Invalid scholarship ID"),
  essay: z
    .string()
    .max(10000, "Essay must not exceed 10000 characters")
    .trim()
    .optional(),
  financialInfo: z.any().optional(),
});

const updateApplicationSchema = z.object({
  essay: z
    .string()
    .max(10000, "Essay must not exceed 10000 characters")
    .trim()
    .optional(),
  financialInfo: z.any().optional(),
});

const uploadDocumentSchema = z.object({
  type: z.enum(documentTypeValues, {
    message: `Invalid document type. Must be one of: ${documentTypeValues.join(", ")}`,
  }),
});

const uploadBulkDocumentsSchema = z.object({
  types: z
    .array(
      z.enum(documentTypeValues, {
        message: `Invalid document type. Must be one of: ${documentTypeValues.join(", ")}`,
      })
    )
    .min(1, "At least one document type is required")
    .max(10, "Cannot upload more than 10 documents at once"),
});

export const ApplicationValidation = {
  createApplicationSchema,
  updateApplicationSchema,
  uploadDocumentSchema,
  uploadBulkDocumentsSchema,
};