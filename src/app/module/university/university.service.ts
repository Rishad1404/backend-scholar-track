/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from "express";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { deleteFileFromCloudinary } from "../../../config/cloudinary.config";
import { Role, ScholarshipStatus, UniversityStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { TUpdateUniversityStatusPayload } from "./university.validation";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Prisma, University } from "../../../generated/prisma/client";
import { universityFilterableFields, universityIncludeConfig, universitySearchableFields } from "./university.constant";

const getAllUniversities = async (
  userId: string,
  role: string,
  query: IQueryParams
) => {
  const queryBuilder = new QueryBuilder<
    University,
    Prisma.UniversityWhereInput,
    Prisma.UniversityInclude
  >(prisma.university, query, {
    searchableFields: universitySearchableFields,
    filterableFields: universityFilterableFields,
  });

  // 🛡️ RBAC Logic: Lock University Admins to their specific university ID.
  // Super Admins bypass this block and naturally query all universities.
  if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    // Force the query to ONLY return their university
    queryBuilder.where({ id: currentAdmin.universityId });
  }

  // Execute the chained query builder
  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .dynamicInclude(universityIncludeConfig)
    .paginate()
    .sort() 
    .fields()
    .execute();

  return result;
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

  const { status: newStatus } = payload;

  // Prevent setting same status
  if (university.status === newStatus) {
    throw new AppError(
      status.BAD_REQUEST,
      `University is already ${newStatus.toLowerCase()}`,
    );
  }

  // Valid transition rules
  // PENDING  → APPROVED
  // PENDING  → SUSPENDED  (must be approved first)
  // APPROVED → SUSPENDED
  // APPROVED → PENDING    (no going back to pending)
  // SUSPENDED → APPROVED
  // SUSPENDED → PENDING   (no going back to pending)

  if (
    newStatus === UniversityStatus.SUSPENDED &&
    university.status === UniversityStatus.PENDING
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot suspend a university that has not been approved yet",
    );
  }

  if (newStatus === UniversityStatus.PENDING) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot revert university status back to pending",
    );
  }

  return await prisma.university.update({
    where: { id: universityId },
    data: { status: newStatus },
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
};
const deleteUniversity = async (universityId: string) => {
  const university = await prisma.university.findFirst({
    where: { id: universityId, isDeleted: false },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  // Check all active related data
  const [
    activeAdmins,
    activeStudents,
    activeDeptHeads,
    activeReviewers,
    activeDepartments,
    activeScholarships,
  ] = await Promise.all([
    prisma.admin.count({ where: { universityId, isDeleted: false } }),
    prisma.student.count({ where: { universityId, isDeleted: false } }),
    prisma.departmentHead.count({ where: { universityId, isDeleted: false } }),
    prisma.reviewer.count({ where: { universityId, isDeleted: false } }),
    prisma.department.count({ where: { universityId, isDeleted: false } }), // New
    prisma.scholarship.count({ where: { universityId, isDeleted: false } }), // New
  ]);

  if (activeDepartments > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete university with ${activeDepartments} active department(s).`,
    );
  }

  if (activeScholarships > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete university with ${activeScholarships} active scholarship(s).`,
    );
  }

  if (activeAdmins > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete university with ${activeAdmins} active admin(s). Remove them first.`,
    );
  }

  if (activeStudents > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete university with ${activeStudents} active student(s).`,
    );
  }

  if (activeDeptHeads > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete university with ${activeDeptHeads} active department head(s).`,
    );
  }

  if (activeReviewers > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete university with ${activeReviewers} active reviewer(s).`,
    );
  }

  if (university.logoUrl) {
    await deleteFileFromCloudinary(university.logoUrl).catch((err) =>
      console.error("Failed to delete logo:", err.message),
    );
  }

  return await prisma.university.update({
    where: { id: universityId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
};


const getPublicUniversities = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    University,
    Prisma.UniversityWhereInput,
    Prisma.UniversityInclude
  >(prisma.university, query, {
    searchableFields: ["name"],
    filterableFields: [],
  });

  const result = await queryBuilder
    .search()
    .filter()
    .where({
      isDeleted: false,
      status: UniversityStatus.APPROVED,
    })
    .include({
      _count: {
        select: {
          students: true,
          scholarships: true,
          departments: true,
        },
      },
    })
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

// ADD this new method:
const getPublicUniversityById = async (universityId: string) => {
  const university = await prisma.university.findFirst({
    where: {
      id: universityId,
      isDeleted: false,
      status: UniversityStatus.APPROVED,
    },
    include: {
      departments: {
        where: { isDeleted: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
      academicLevels: {
        where: { isDeleted: false },
        select: { id: true, name: true },
      },
      _count: {
        select: {
          students: true,
          scholarships: true,
          departments: true,
          admins: true,
          reviewers: true,
          departmentHeads: true,
        },
      },
    },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  // Also fetch active scholarships count
  const activeScholarshipsCount = await prisma.scholarship.count({
    where: {
      universityId,
      isDeleted: false,
      status: ScholarshipStatus.ACTIVE,
    },
  });

  return {
    ...university,
    activeScholarshipsCount,
  };
};



export const UniversityService = {
  getAllUniversities,
  getUniversityById,
  updateUniversity,
  updateUniversityStatus,
  deleteUniversity,
  getPublicUniversities,
  getPublicUniversityById
};
