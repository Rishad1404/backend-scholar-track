import { Prisma } from "../../../generated/prisma/client";

export const adminSearchableFields = [
  "user.name",
  "user.email",
  "phone",
];

export const adminFilterableFields = [
  "universityId",
  "isOwner",
  "isDeleted",
];

export const adminIncludeConfig: Partial<
  Record<
    keyof Prisma.AdminInclude,
    Prisma.AdminInclude[keyof Prisma.AdminInclude]
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
      status: true,
    },
  },
};