import { z } from "zod";
import { DocumentType, ScholarshipStatus } from "../../../generated/prisma/enums";

const documentTypeValues = Object.values(DocumentType) as [string, ...string[]];
const scholarshipStatusValues = Object.values(ScholarshipStatus) as [string, ...string[]];

// For JSON body (no file upload)
const createScholarshipSchema = z
  .object({
    title: z.string().min(3).max(255).trim(),
    description: z.string().max(5000).trim().optional(),
    departmentId: z.string().optional(),
    levelId: z.string().optional(),
    totalAmount: z.number().positive(),
    amountPerStudent: z.number().positive(),
    quota: z.number().int().positive(),
    deadline: z.string().refine(
      (val) => new Date(val) > new Date(),
      "Deadline must be in the future"
    ),
    requiredDocTypes: z.array(z.enum(documentTypeValues)).min(1).optional(),
    minGpa: z.number().min(0).max(4).optional(),
    minCgpa: z.number().min(0).max(4).optional(),
    financialNeedRequired: z.boolean().optional().default(false),
  })
  .refine((data) => data.amountPerStudent * data.quota <= data.totalAmount, {
    message: "amountPerStudent × quota cannot exceed totalAmount",
    path: ["totalAmount"],
  });

const updateScholarshipSchema = z.object({
  title: z.string().min(3).max(255).trim().optional(),
  description: z.string().max(5000).trim().optional(),
  departmentId: z.string().nullable().optional(),
  levelId: z.string().nullable().optional(),
  totalAmount: z.number().positive().optional(),
  amountPerStudent: z.number().positive().optional(),
  quota: z.number().int().positive().optional(),
  deadline: z.string().optional(),
  requiredDocTypes: z.array(z.enum(documentTypeValues)).min(1).optional(),
  minGpa: z.number().min(0).max(4).nullable().optional(),
  minCgpa: z.number().min(0).max(4).nullable().optional(),
  financialNeedRequired: z.boolean().optional(),
});

const changeScholarshipStatusSchema = z.object({
  status: z.enum(scholarshipStatusValues, {
    message: "Invalid status. Must be a valid ScholarshipStatus",
  }),
});

export const ScholarshipValidation = {
  createScholarshipSchema,
  updateScholarshipSchema,
  changeScholarshipStatusSchema,
};

export type TCreateScholarshipPayload = z.infer<typeof createScholarshipSchema>;
export type TUpdateScholarshipPayload = z.infer<typeof updateScholarshipSchema>;