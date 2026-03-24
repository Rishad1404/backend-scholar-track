import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { prisma } from "../../lib/prisma";
import { Role } from "../../../generated/prisma/enums";
import { TCreateAcademicTermPayload } from "./term.validation";

const createAcademicTerm = async (
  userId: string,
  role: string,
  payload: TCreateAcademicTermPayload,
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

  const existingTerm = await prisma.academicTerm.findFirst({
    where: {
      universityId,
      name: { equals: payload.name, mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (existingTerm) {
    throw new AppError(
      status.CONFLICT,
      `An academic term named '${payload.name}' already exists for this university.`,
    );
  }

  return await prisma.academicTerm.create({
    data: {
      ...payload,
      universityId: universityId!,
    },
  });
};

const getAllAcademicTerms = async (
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

  return await prisma.academicTerm.findMany({
    where: {
      isDeleted: false,
      ...(targetUniversityId && { universityId: targetUniversityId }),
    },
    orderBy: { name: "asc" },
  });
};

const deleteAcademicTerm = async (userId: string, role: string, id: string) => {
  const term = await prisma.academicTerm.findUnique({
    where: { id, isDeleted: false },
  });

  if (!term) throw new AppError(status.NOT_FOUND, "Academic term not found");

  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findUnique({
      where: { userId },
      select: { universityId: true },
    });

    if (!admin || admin.universityId !== term.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only delete terms belonging to your university",
      );
    }
  }

  return await prisma.academicTerm.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

export const AcademicTermService = {
  createAcademicTerm,
  getAllAcademicTerms,
  deleteAcademicTerm,
};
