// src/app/modules/user/user.constant.ts

import { Prisma } from "../../../generated/prisma/client";

export const userSearchableFields = ["name", "email"];

export const userFilterableFields = ["role", "status", "emailVerified"];

export const userIncludeConfig: Partial<
  Record<
    keyof Prisma.UserInclude,
    Prisma.UserInclude[keyof Prisma.UserInclude]
  >
> = {
  admin: {
    select: {
      id: true,
      universityId: true,
      isOwner: true,
      subscriptionStatus: true,
      university: {
        select: { id: true, name: true },
      },
    },
  },
  student: {
    select: {
      id: true,
      universityId: true,
      university: {
        select: { id: true, name: true },
      },
    },
  },
  departmentHead: {
    select: {
      id: true,
      universityId: true,
      departmentId: true,
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  },
  reviewer: {
    select: {
      id: true,
      universityId: true,
      university: { select: { id: true, name: true } },
    },
  },
};