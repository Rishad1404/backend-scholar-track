import { Prisma } from "../../../generated/prisma/client";

export const departmentSearchableFields = ["name"];

export const departmentFilterableFields = ["universityId", "isDeleted"];

export const departmentAdminIncludeConfig: Partial<
  Record<
    keyof Prisma.DepartmentInclude,
    Prisma.DepartmentInclude[keyof Prisma.DepartmentInclude]
  >
> = {
  university: { select: { id: true, name: true } },
  departmentHeads: {
    where: { isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
  _count: {
    select: {
      departmentHeads: true,
      scholarships: true,
      studentAcademicInfos: true,
    },
  },
};

export const departmentPublicIncludeConfig: Partial<
  Record<
    keyof Prisma.DepartmentInclude,
    Prisma.DepartmentInclude[keyof Prisma.DepartmentInclude]
  >
> = {
  university: { select: { id: true, name: true } },
};
