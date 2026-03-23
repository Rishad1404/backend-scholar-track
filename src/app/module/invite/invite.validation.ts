import z from "zod";
import { InviteRole } from "../../../generated/prisma/enums";

export const sendInviteSchema = z
  .object({
    email: z.email("Invalid email address"),
    role: z.enum([InviteRole.DEPARTMENT_HEAD, InviteRole.COMMITTEE_REVIEWER], {
      message: "Role must be DEPARTMENT_HEAD or COMMITTEE_REVIEWER",
    }),
    departmentId: z.string().optional(),
  })
  .refine(
    (data) => {
      // departmentId is required for DEPARTMENT_HEAD
      if (data.role === InviteRole.DEPARTMENT_HEAD && !data.departmentId) {
        return false;
      }
      return true;
    },
    {
      message: "departmentId is required for Department Head invites",
      path: ["departmentId"],
    },
  );

export const acceptInviteSchema = z.object({
  token: z.string("Token is required"),
  name: z
    .string("Name is required")
    .min(5, "Name must be at least 5 characters")
    .max(100),
  password: z
    .string("Password is required")
    .min(8, "Password must be at least 8 characters")
    // .regex(
    //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    //   "Password must contain uppercase, lowercase and a number"
    // )
    ,
  phone: z.string().min(11).max(15).optional(),
  designation: z.string().max(100).optional(),
});

export type TSendInvitePayload = z.infer<typeof sendInviteSchema>;
export type TAcceptInvitePayload = z.infer<typeof acceptInviteSchema>;
