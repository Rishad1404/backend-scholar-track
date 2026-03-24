import { Prisma } from "../../../generated/prisma/client";

export const reviewerSearchableFields = [
  "user.name",
  "user.email",
  "expertise",
  "designation",
  "phone",
];

export const reviewerFilterableFields = [
  "universityId",
  "isDeleted",
];

export const reviewerIncludeConfig: Partial<
  Record<
    keyof Prisma.ReviewerInclude,
    Prisma.ReviewerInclude[keyof Prisma.ReviewerInclude]
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
    },
  },
};