import status from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { TRegisterUniversityAdminPayload, TUpdateUserStatusPayload } from "./user.validation";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Prisma, User } from "../../../generated/prisma/client";
import { userFilterableFields, userIncludeConfig, userSearchableFields } from "./user.constant";

const registerUniversityAdmin = async (payload: TRegisterUniversityAdminPayload) => {
  const { name, email, password, universityName, website, phone, designation } = payload;

  // 1. Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  // 2. Check if university name already taken
  const existingUniversity = await prisma.university.findFirst({
    where: { name: universityName, isDeleted: false },
  });

  if (existingUniversity) {
    throw new Error("University with this name already exists");
  }

  // 3. Create User via better-auth
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      role: "UNIVERSITY_ADMIN",
    },
  });

  if (!data.user) {
    throw new Error("Failed to create user");
  }

  // 4. Create University + Admin profile in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: {
        name: universityName,
        website,
      },
    });

    const admin = await tx.admin.create({
      data: {
        userId: data.user.id,
        universityId: university.id,
        name,
        email,
        phone,
        designation,
        isOwner: true,
      },
    });

    return { university, admin };
  });

  return {
    token: data.token,
    user: data.user,
    university: result.university,
    admin: result.admin,
  };
};

const getAllUsers = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    User,
    Prisma.UserWhereInput,
    Prisma.UserInclude
  >(prisma.user, query, {
    searchableFields: userSearchableFields,
    filterableFields: userFilterableFields,
  });

  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .dynamicInclude(userIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

// ═══════════════════════════════════════════
// GET USER BY ID (SUPER_ADMIN only)
// ═══════════════════════════════════════════
const getUserById = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    include: {
      admin: {
        where: { isDeleted: false },
        include: {
          university: {
            select: { id: true, name: true, status: true, logoUrl: true },
          },
        },
      },
      student: {
        where: { isDeleted: false },
        include: {
          university: {
            select: { id: true, name: true, status: true },
          },
          academicInfo: {
            include: {
              department: { select: { id: true, name: true } },
              level: { select: { id: true, name: true } },
              term: { select: { id: true, name: true } },
            },
          },
        },
      },
      departmentHead: {
        where: { isDeleted: false },
        include: {
          university: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      },
      reviewer: {
        where: { isDeleted: false },
        include: {
          university: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: {
          notifications: true,
          sentInvites: true,
          sessions: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

// ═══════════════════════════════════════════
// UPDATE USER STATUS (Ban / Unban)
// ═══════════════════════════════════════════
const updateUserStatus = async (
  targetUserId: string,
  payload: TUpdateUserStatusPayload
) => {
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, isDeleted: false },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // Cannot modify SUPER_ADMIN accounts
  if (user.role === Role.SUPER_ADMIN) {
    throw new AppError(
      status.FORBIDDEN,
      "Cannot modify Super Admin accounts"
    );
  }

  // Prevent setting same status
  if (user.status === payload.status) {
    throw new AppError(
      status.BAD_REQUEST,
      `User is already ${payload.status.toLowerCase()}`
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: payload.status as UserStatus },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // If banning, invalidate all sessions
  if (payload.status === "BANNED") {
    await prisma.session.deleteMany({
      where: { userId: targetUserId },
    });
  }

  return updatedUser;
};

// ═══════════════════════════════════════════
// DELETE USER (Soft delete)
// ═══════════════════════════════════════════
const deleteUser = async (targetUserId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, isDeleted: false },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // Cannot delete SUPER_ADMIN accounts
  if (user.role === Role.SUPER_ADMIN) {
    throw new AppError(
      status.FORBIDDEN,
      "Cannot delete Super Admin accounts"
    );
  }

  // Soft delete the user
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      status: UserStatus.DELETED,
    },
  });

  // Also soft delete related role profiles
  if (user.role === Role.UNIVERSITY_ADMIN) {
    await prisma.admin.updateMany({
      where: { userId: targetUserId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  if (user.role === Role.STUDENT) {
    await prisma.student.updateMany({
      where: { userId: targetUserId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  if (user.role === Role.DEPARTMENT_HEAD) {
    await prisma.departmentHead.updateMany({
      where: { userId: targetUserId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  if (user.role === Role.COMMITTEE_REVIEWER) {
    await prisma.reviewer.updateMany({
      where: { userId: targetUserId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // Invalidate all sessions
  await prisma.session.deleteMany({
    where: { userId: targetUserId },
  });

  return null;
};



export const UserService = {
  registerUniversityAdmin,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
};
