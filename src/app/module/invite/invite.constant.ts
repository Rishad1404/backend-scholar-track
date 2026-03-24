import { Prisma } from "../../../generated/prisma/client";

export const inviteSearchableFields = [
  "email",
  "role",
];

export const inviteFilterableFields = [
  "universityId",
  "departmentId",
  "status",
  "role",
  "isDeleted",
];

export const inviteIncludeConfig: Partial<
  Record<
    keyof Prisma.InviteInclude,
    Prisma.InviteInclude[keyof Prisma.InviteInclude]
  >
> = {
  university: { 
    select: { id: true, name: true } 
  },
  department: { 
    select: { id: true, name: true } 
  },
  invitedBy: { 
    select: { id: true, name: true, email: true } 
  },
};