import z from "zod";

export const addDepartmentHeadSchema = z.object({
  name: z
    .string("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100),
  email: z.email("Invalid email address"),
  password: z
    .string("Password is required")
    .min(8, "Password must be at least 8 characters")
  // .regex(
  //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  //   "Password must contain uppercase, lowercase and a number"
  // )
  ,
  departmentId: z.string("Department ID is required"),
  phone: z.string().min(11).max(15).optional(),
  designation: z.string().max(100).optional(),
});

export const updateDepartmentHeadSchema = z.object({
  departmentHead: z
    .object({
      phone: z
        .string("Phone is required")
        .min(11)
        .max(15)
        .optional(),
      designation: z
        .string("Designation is required")
        .max(100)
        .optional(),
      name: z
        .string("Name is required")
        .min(2)
        .max(100)
        .optional(),
    })
    .optional(),
});


export type TUpdateDepartmentHeadPayload = z.infer<typeof updateDepartmentHeadSchema>;
export type TAddDepartmentHeadPayload = z.infer<typeof addDepartmentHeadSchema>;
