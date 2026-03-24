import { Prisma } from "../../../generated/prisma/client";

export const universitySearchableFields = [
  "name",
  "website",
  "address", // Add any other string fields you store
];

export const universityFilterableFields = [
  "status",
  "isDeleted",
];

export const universityIncludeConfig: Partial<
  Record<
    keyof Prisma.UniversityInclude,
    Prisma.UniversityInclude[keyof Prisma.UniversityInclude]
  >
> = {
  _count: {
    select: {
      admins: true,
      departments: true,
      scholarships: true,
      students: true,
      departmentHeads: true,
      reviewers: true,
    },
  },
};