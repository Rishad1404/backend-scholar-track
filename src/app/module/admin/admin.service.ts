import status from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { TAddAdminToUniversityPayload, TUpdateAdminPayload } from "./admin.validation";
import { auth } from "../../lib/auth";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Admin, Prisma } from "../../../generated/prisma/client";
import {
  adminFilterableFields,
  adminIncludeConfig,
  adminSearchableFields,
} from "./admin.constant";

const getAllAdmins = async (userId: string, role: string, query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Admin,
    Prisma.AdminWhereInput,
    Prisma.AdminInclude
  >(prisma.admin, query, {
    searchableFields: adminSearchableFields,
    filterableFields: adminFilterableFields,
  });


  if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findUnique({
      where: { userId },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    
    queryBuilder.where({ universityId: currentAdmin.universityId });
  }

  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .dynamicInclude(adminIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};


const getAdminById = async (userId: string, role: string, adminId: string) => {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId, isDeleted: false },
    include: {
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
    },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  // Super Admin → can see any admin
  if (role === Role.SUPER_ADMIN) {
    return admin;
  }

  // University Admin → can only see admins from their university
  const currentAdmin = await prisma.admin.findUnique({
    where: { userId },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  if (admin.universityId !== currentAdmin.universityId) {
    throw new AppError(
      status.FORBIDDEN,
      "Forbidden access! You don't have access to this admin",
    );
  }

  return admin;
};

const updateAdmin = async (
  userId: string,
  role: string,
  adminId: string,
  payload: TUpdateAdminPayload,
) => {
  const adminData = payload.admin;

  if (!adminData) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const targetAdmin = await prisma.admin.findUnique({
    where: { id: adminId, isDeleted: false },
  });

  if (!targetAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  if (role === Role.SUPER_ADMIN) {
    // Can update any admin + can change isOwner
  } else if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findUnique({
      where: { userId },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (currentAdmin.universityId !== targetAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to update this admin",
      );
    }

    const isSelf = currentAdmin.id === targetAdmin.id;

    if (!isSelf && !currentAdmin.isOwner) {
      throw new AppError(
        status.FORBIDDEN,
        "Only the owner admin can update other admins",
      );
    }

    if (!currentAdmin.isOwner && adminData.isOwner !== undefined) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to change ownership",
      );
    }
  }

  // 3. Separate User fields and Admin fields
  const { name, ...adminFields } = adminData;

  // 4. Update in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const updatedAdmin = await tx.admin.update({
      where: { id: adminId },
      data: {
        ...adminFields,
        ...(name && { name }),
      },
      include: {
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
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (name) {
      await tx.user.update({
        where: { id: targetAdmin.userId },
        data: { name },
      });
    }

    return updatedAdmin;
  });

  return result;
};

const addAdminToUniversity = async (
  userId: string,
  role: string,
  payload: TAddAdminToUniversityPayload,
) => {
  const { name, email, password, phone, designation } = payload;

  // 1. Find current admin to get universityId
  const currentAdmin = await prisma.admin.findUnique({
    where: { userId },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  // 2. Only Owner Admin or Super Admin can add admins
  if (role !== Role.SUPER_ADMIN && !currentAdmin.isOwner) {
    throw new AppError(status.FORBIDDEN, "Only the owner admin can add new admins");
  }

  // 3. Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "Email already registered");
  }

  // 4. Create User via better-auth
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      role: "UNIVERSITY_ADMIN",
    },
  });

  if (!data.user) {
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create user");
  }

  // 5. Create Admin profile (same university, NOT owner)
  const admin = await prisma.admin.create({
    data: {
      userId: data.user.id,
      universityId: currentAdmin.universityId,
      name,
      email,
      phone,
      designation,
      isOwner: false,
    },
    include: {
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
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return admin;
};

const deleteAdmin = async (adminId: string, requestUser: IRequestUser) => {
  // 1) Find target admin (must exist and not deleted)
  const targetAdmin = await prisma.admin.findFirst({
    where: { id: adminId, isDeleted: false },
  });

  if (!targetAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  // 2) Permission checks
  if (requestUser.role === Role.UNIVERSITY_ADMIN) {
    const requestingAdmin = await prisma.admin.findFirst({
      where: { userId: requestUser.userId, isDeleted: false },
    });

    if (!requestingAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    const isSelf = targetAdmin.userId === requestUser.userId;

    // Non-owner can only delete themselves
    if (!requestingAdmin.isOwner && !isSelf) {
      throw new AppError(status.FORBIDDEN, "You do not have permission to delete admins");
    }

    // Owner deleting others must be same university
    if (requestingAdmin.isOwner && !isSelf) {
      if (requestingAdmin.universityId !== targetAdmin.universityId) {
        throw new AppError(
          status.FORBIDDEN,
          "You can only delete admins from your own university",
        );
      }

      // Owner cannot delete another owner (business rule)
      if (targetAdmin.isOwner) {
        throw new AppError(status.FORBIDDEN, "You cannot delete another owner admin");
      }
    }
  } else if (requestUser.role === Role.SUPER_ADMIN) {
    // Optional rule:
    // If you want to prevent SUPER_ADMIN from deleting owner admins:
    // if (targetAdmin.isOwner) throw new AppError(status.FORBIDDEN, "Cannot delete owner admin");
  } else {
    throw new AppError(status.FORBIDDEN, "You are not allowed to delete admins");
  }

  // 3) Soft delete Admin + User, and kill sessions (transaction)
  const result = await prisma.$transaction(async (tx) => {
    const deletedAdmin = await tx.admin.update({
      where: { id: adminId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: targetAdmin.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    // Kill sessions so they get logged out immediately
    await tx.session.deleteMany({
      where: { userId: targetAdmin.userId },
    });

    // Recommended: DON'T delete accounts for soft delete.
    // If you insist, uncomment:
    // await tx.account.deleteMany({ where: { userId: targetAdmin.userId } });

    // Return enriched data
    const adminWithDetails = await tx.admin.findUnique({
      where: { id: deletedAdmin.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            isDeleted: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return adminWithDetails;
  });

  return result;
};

export const AdminService = {
  getAllAdmins,
  getAdminById,
  updateAdmin,
  addAdminToUniversity,
  deleteAdmin,
};
