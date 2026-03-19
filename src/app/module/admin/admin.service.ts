import status from "http-status";
import { Role } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { TUpdateAdminPayload } from "./admin.validation";

const getAllAdmins = async (userId: string, role: string) => {
  // Super Admin → return ALL admins
  if (role === Role.SUPER_ADMIN) {
    const admins = await prisma.admin.findMany({
      where: { isDeleted: false },
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
      orderBy: { createdAt: "desc" },
    });

    return admins;
  }

  // University Admin → return only their university's admins
  const currentAdmin = await prisma.admin.findUnique({
    where: { userId },
  });

  if (!currentAdmin) {
    throw new Error("Admin profile not found");
  }

  const admins = await prisma.admin.findMany({
    where: {
      universityId: currentAdmin.universityId,
      isDeleted: false,
    },
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
    orderBy: { createdAt: "desc" },
  });

  return admins;
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
  payload: TUpdateAdminPayload
) => {
  const adminData = payload.admin;

  if (!adminData) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  // 1. Find the target admin
  const targetAdmin = await prisma.admin.findUnique({
    where: { id: adminId, isDeleted: false },
  });

  if (!targetAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  // 2. Permission checks
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
      throw new AppError(status.FORBIDDEN, "You don't have permission to update this admin");
    }

    const isSelf = currentAdmin.id === targetAdmin.id;

    if (!isSelf && !currentAdmin.isOwner) {
      throw new AppError(status.FORBIDDEN, "Only the owner admin can update other admins");
    }

    if (!currentAdmin.isOwner && adminData.isOwner !== undefined) {
      throw new AppError(status.FORBIDDEN, "You don't have permission to change ownership");
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

export const AdminService = {
  getAllAdmins,
  getAdminById,
  updateAdmin,
};
