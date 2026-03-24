import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { prisma } from "../../lib/prisma";
import { Role } from "../../../generated/prisma/enums";
import { TCreateAcademicLevelPayload } from "./level.validation"; // Assuming you made this!

const createAcademicLevel = async (
  userId: string,
  role: string,
  payload: TCreateAcademicLevelPayload,
) => {
  let universityId = payload.universityId;

  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findUnique({
      where: { userId },
      select: { universityId: true },
    });

    if (!admin) throw new AppError(status.NOT_FOUND, "Admin profile not found");
    universityId = admin.universityId;
  }

  if (role === Role.SUPER_ADMIN && !universityId) {
    throw new AppError(status.BAD_REQUEST, "Super Admins must provide a universityId");
  }

  const existingLevel = await prisma.academicLevel.findFirst({
    where: {
      universityId,
      name: { equals: payload.name, mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (existingLevel) {
    throw new AppError(
      status.CONFLICT,
      `An academic level named '${payload.name}' already exists for this university.`,
    );
  }
  return await prisma.academicLevel.create({
    data: {
      ...payload,
      universityId: universityId!,
    },
  });
};

const getAllAcademicLevels = async (
  userId?: string,
  role?: string,
  queryUniversityId?: string,
) => {
  let targetUniversityId = queryUniversityId;

  if (role === Role.UNIVERSITY_ADMIN && userId) {
    const admin = await prisma.admin.findUnique({
      where: { userId },
      select: { universityId: true },
    });
    if (admin) targetUniversityId = admin.universityId;
  }

  return await prisma.academicLevel.findMany({
    where: {
      isDeleted: false,
      ...(targetUniversityId && { universityId: targetUniversityId }),
    },
    orderBy: { name: "asc" },
  });
};

const deleteAcademicLevel = async (userId: string, role: string, id: string) => {
  const level = await prisma.academicLevel.findUnique({
    where: { id, isDeleted: false },
  });

  if (!level) throw new AppError(status.NOT_FOUND, "Academic level not found");

  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findUnique({
      where: { userId },
      select: { universityId: true },
    });

    if (!admin || admin.universityId !== level.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only delete levels belonging to your university",
      );
    }
  }

  return await prisma.academicLevel.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

export const AcademicLevelService = {
  createAcademicLevel,
  getAllAcademicLevels,
  deleteAcademicLevel,
};
