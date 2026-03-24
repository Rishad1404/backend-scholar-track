import { Prisma } from "../../../generated/prisma/client";

export const departmentHeadSearchableFields = [
  "user.name",
  "user.email",
  "phone", 
];

export const departmentHeadFilterableFields = [
  "universityId",
  "departmentId",
  "isDeleted",
];

export const departmentHeadIncludeConfig: Partial<
  Record<
    keyof Prisma.DepartmentHeadInclude,
    Prisma.DepartmentHeadInclude[keyof Prisma.DepartmentHeadInclude]
  >
> = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      status: true,
    },
  },
  university: {
    select: { id: true, name: true },
  },
  department: {
    select: { id: true, name: true },
  },
};