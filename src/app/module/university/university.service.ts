/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from "express";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { deleteFileFromCloudinary } from "../../../config/cloudinary.config";
import { Role, UniversityStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { TUpdateUniversityStatusPayload } from "./university.validation";

const getAllUniversities = async (userId: string, role: string) => {
  if (role === Role.SUPER_ADMIN) {
    return await prisma.university.findMany({
      where: { isDeleted: false },
      include: {
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
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const currentAdmin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  const university = await prisma.university.findFirst({
    where: {
      id: currentAdmin.universityId,
      isDeleted: false,
    },
    include: {
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
    },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  return [university];
};

const getUniversityById = async (userId: string, role: string, universityId: string) => {
  const university = await prisma.university.findFirst({
    where: { id: universityId, isDeleted: false },
    include: {
      admins: {
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
      departments: {
        where: { isDeleted: false },
        select: { id: true, name: true },
      },
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
    },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  if (role !== Role.SUPER_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (university.id !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to view this university",
      );
    }
  }

  return university;
};

const updateUniversity = async (
  userId: string,
  role: string,
  universityId: string,
  req: Request,
) => {
  const file = req.file;

  // Parse university data — could be JSON string (form-data) or object (JSON body)
  let universityData;
  if (typeof req.body.university === "string") {
    try {
      universityData = JSON.parse(req.body.university);
    } catch {
      throw new AppError(status.BAD_REQUEST, "Invalid university data format");
    }
  } else {
    universityData = req.body.university;
  }

  if (!universityData && !file) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const university = await prisma.university.findFirst({
    where: { id: universityId, isDeleted: false },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  // Permission check
  if (role !== Role.SUPER_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (!currentAdmin.isOwner) {
      throw new AppError(
        status.FORBIDDEN,
        "Only the owner admin can update university details",
      );
    }

    if (university.id !== currentAdmin.universityId) {
      throw new AppError(status.FORBIDDEN, "You can only update your own university");
    }
  }

  // Check duplicate name
  if (universityData?.name) {
    const existing = await prisma.university.findFirst({
      where: {
        name: universityData.name,
        isDeleted: false,
        NOT: { id: universityId },
      },
    });

    if (existing) {
      throw new AppError(status.CONFLICT, "University with this name already exists");
    }
  }

  // Build update data
  const updateData: Record<string, any> = {};

  if (universityData?.name) updateData.name = universityData.name;
  if (universityData?.website) updateData.website = universityData.website;

  // Handle logo upload
  if (file) {
    // Delete old logo from Cloudinary
    if (university.logoUrl) {
      await deleteFileFromCloudinary(university.logoUrl).catch((err) =>
        console.error("Failed to delete old logo:", err.message),
      );
    }

    // Multer-cloudinary sets path and filename
    updateData.logoUrl = (file as any).path;
    updateData.logoPublicId = (file as any).filename;
  }

  const updatedUniversity = await prisma.university.update({
    where: { id: universityId },
    data: updateData,
    include: {
      _count: {
        select: {
          admins: true,
          departments: true,
          scholarships: true,
          students: true,
        },
      },
    },
  });

  return updatedUniversity;
};

const updateUniversityStatus = async (
  universityId: string,
  payload: TUpdateUniversityStatusPayload,
) => {
  const university = await prisma.university.findFirst({
    where: { id: universityId, isDeleted: false },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  const updatedUniversity = await prisma.university.update({
    where: { id: universityId },
    data: {
      status: payload.status as UniversityStatus,
    },
    include: {
      _count: {
        select: {
          admins: true,
          departments: true,
          scholarships: true,
          students: true,
        },
      },
    },
  });

  return updatedUniversity;
};

const deleteUniversity = async (universityId: string) => {
  const university = await prisma.university.findFirst({
    where: { id: universityId, isDeleted: false },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  const activeAdmins = await prisma.admin.count({
    where: { universityId, isDeleted: false },
  });

  if (activeAdmins > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete university with active admins. Remove all admins first.",
    );
  }

  // Delete logo from Cloudinary
  if (university.logoUrl) {
    await deleteFileFromCloudinary(university.logoUrl).catch((err) =>
      console.error("Failed to delete logo:", err.message),
    );
  }

  const result = await prisma.university.update({
    where: { id: universityId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return result;
};

const getPublicUniversities = async () => {
  return await prisma.university.findMany({
    where: {
      isDeleted: false,
      status: UniversityStatus.APPROVED,
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      website: true,
      _count: {
        select: {
          departments: true,
          scholarships: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const UniversityService = {
  getAllUniversities,
  getUniversityById,
  updateUniversity,
  updateUniversityStatus,
  deleteUniversity,
  getPublicUniversities,
};
