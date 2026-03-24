import z from "zod";

export const completeProfileSchema = z.object({
  universityId: z.string("University ID is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    message: "Gender must be MALE, FEMALE or OTHER",
  }),
  dateOfBirth: z.string("Date of birth is required"),
  bloodGroup: z
    .enum(["A_POS", "A_NEG", "B_POS", "B_NEG", "O_POS", "O_NEG", "AB_POS", "AB_NEG"])
    .optional(),
  phone: z.string().min(11).max(15).optional(),
  address: z.string().max(500).optional(),
});

export const updateProfileSchema = z.object({
  student: z
    .object({
      name: z
        .string("Name must be a string")
        .min(2)
        .max(100)
        .optional(),
      gender: z
        .enum(["MALE", "FEMALE", "OTHER"])
        .optional(),
      dateOfBirth: z.string().optional(),
      bloodGroup: z
        .enum(["A_POS", "A_NEG", "B_POS", "B_NEG", "O_POS", "O_NEG", "AB_POS", "AB_NEG"])
        .optional(),
      phone: z.string().min(11).max(15).optional(),
      address: z.string().max(500).optional(),
    })
    .optional(),
});

export const completeAcademicInfoSchema = z.object({
  departmentId: z.string("Department ID is required"),
  levelId: z.string("Level ID is required"),
  termId: z.string("Term ID is required"),
  studentIdNo: z
    .string("Student ID is required")
    .min(1)
    .max(100),
  gpa: z.number("GPA is required").min(0).max(4),
  cgpa: z.number("CGPA is required").min(0).max(4),
  creditHoursCompleted: z.number().int().min(0).optional(),
});

export const updateAcademicInfoSchema = z.object({
  academicInfo: z
    .object({
      departmentId: z.string().optional(),
      levelId: z.string().optional(),
      termId: z.string().optional(),
      studentIdNo: z.string().max(100).optional(),
      gpa: z.number().min(0).max(4).optional(),
      cgpa: z.number().min(0).max(4).optional(),
      creditHoursCompleted: z.number().int().min(0).optional(),
      academicStatus: z
        .enum(["REGULAR", "PROBATION", "SUSPENDED", "DROPPED_OUT"])
        .optional(),
    })
    .optional(),
});

export const changeAcademicStatusSchema = z.object({
  academicStatus: z.enum(
    ["REGULAR", "PROBATION", "SUSPENDED", "DROPPED_OUT"],
    {
      message: "Status must be REGULAR, PROBATION, SUSPENDED or DROPPED_OUT",
    }
  ),
});

export type TCompleteProfilePayload = z.infer<typeof completeProfileSchema>;
export type TUpdateProfilePayload = z.infer<typeof updateProfileSchema>;
export type TCompleteAcademicInfoPayload = z.infer<typeof completeAcademicInfoSchema>;
export type TUpdateAcademicInfoPayload = z.infer<typeof updateAcademicInfoSchema>;