import { Prisma } from "../../../generated/prisma/client";


export const studentSearchableFields = [
  "name",
  "email",
  "phone",
  "user.name",
  "user.email",
  "academicInfo.studentIdNo",
];

export const studentFilterableFields = [
  "gender",
  "bloodGroup",
  "universityId",
  "isDeleted",
  "academicInfo.departmentId",
  "academicInfo.levelId",
  "academicInfo.termId",
  "academicInfo.academicStatus",
];

export const studentIncludeConfig: Partial<
  Record<
    keyof Prisma.StudentInclude,
    Prisma.StudentInclude[keyof Prisma.StudentInclude]
  >
> = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      status: true,
      emailVerified: true,
    },
  },
  university: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  },
  academicInfo: {
    include: {
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      term: { select: { id: true, name: true } },
    },
  },
  applications: {
    where: { isDeleted: false },
    select: {
      id: true,
      status: true,
      scholarship: { select: { id: true, title: true } },
    },
  },
  disbursements: {
    select: {
      id: true,
      amount: true,
      status: true,
    },
  },
};