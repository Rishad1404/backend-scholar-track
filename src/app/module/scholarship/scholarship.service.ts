/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from "express";
import status from "http-status";
import {
  scholarshipSearchableFields,
  scholarshipFilterableFields,
  scholarshipIncludeConfig,
} from "./scholarship.constant";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import {
  Prisma,
  Role,
  Scholarship,
  ScholarshipStatus,
} from "../../../generated/prisma/client";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { deleteFileFromCloudinary } from "../../../config/cloudinary.config";


const getAdminUniversityId = async (userId: string): Promise<string> => {
  const admin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  return admin.universityId;
};


const parseScholarshipBody = (body: Record<string, any>): Record<string, any> => {
  const parsed: Record<string, any> = {};

  // If data comes as JSON string (form-data)
  if (typeof body.data === "string") {
    try {
      return JSON.parse(body.data);
    } catch {
      throw new AppError(status.BAD_REQUEST, "Invalid data format");
    }
  }

  // Parse individual fields from form-data
  Object.keys(body).forEach((key) => {
    const value = body[key];

    if (value === undefined || value === "") return;

    // Number fields
    if (["totalAmount", "amountPerStudent", "minGpa", "minCgpa"].includes(key)) {
      parsed[key] = parseFloat(value);
      return;
    }

    // Integer fields
    if (["quota"].includes(key)) {
      parsed[key] = parseInt(value, 10);
      return;
    }

    // Boolean fields
    if (["financialNeedRequired"].includes(key)) {
      parsed[key] = value === "true" || value === true;
      return;
    }

    // Array fields (JSON string)
    if (["requiredDocTypes"].includes(key)) {
      if (typeof value === "string") {
        try {
          parsed[key] = JSON.parse(value);
        } catch {
          parsed[key] = [value];
        }
      } else {
        parsed[key] = value;
      }
      return;
    }

    parsed[key] = value;
  });

  return parsed;
};

const createScholarship = async (userId: string, req: Request) => {
  const universityId = await getAdminUniversityId(userId);
  const file = req.file;

  // Parse body (handles both JSON and form-data)
  const payload = parseScholarshipBody(req.body);

  // Validate department belongs to this university
  if (payload.departmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: payload.departmentId,
        universityId,
        isDeleted: false,
      },
    });

    if (!department) {
      throw new AppError(
        status.BAD_REQUEST,
        "Department not found in your university"
      );
    }
  }

  // Validate level belongs to this university
  if (payload.levelId) {
    const level = await prisma.academicLevel.findFirst({
      where: {
        id: payload.levelId,
        universityId,
        isDeleted: false,
      },
    });

    if (!level) {
      throw new AppError(
        status.BAD_REQUEST,
        "Academic level not found in your university"
      );
    }
  }

  // Build create data
  const createData: Record<string, any> = {
    title: payload.title,
    description: payload.description,
    departmentId: payload.departmentId,
    levelId: payload.levelId,
    totalAmount: payload.totalAmount,
    amountPerStudent: payload.amountPerStudent,
    quota: payload.quota,
    deadline: new Date(payload.deadline),
    requiredDocTypes: payload.requiredDocTypes,
    minGpa: payload.minGpa,
    minCgpa: payload.minCgpa,
    financialNeedRequired: payload.financialNeedRequired || false,
    universityId,
    status: ScholarshipStatus.DRAFT,
  };

  // Handle document upload
  if (file) {
    createData.document = (file as any).path;
    createData.documentPublicId = (file as any).filename;
  }

  const scholarship = await prisma.scholarship.create({
    data: createData as Prisma.ScholarshipCreateInput,
    include: {
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
    },
  });

  return scholarship;
};


const getAllScholarships = async (
  userId: string,
  role: string,
  query: IQueryParams
) => {
  const queryBuilder = new QueryBuilder<
    Scholarship,
    Prisma.ScholarshipWhereInput,
    Prisma.ScholarshipInclude
  >(prisma.scholarship, query, {
    searchableFields: scholarshipSearchableFields,
    filterableFields: scholarshipFilterableFields,
  });

  if (role === Role.UNIVERSITY_ADMIN) {
    const universityId = await getAdminUniversityId(userId);
    queryBuilder.where({ universityId });
  }

  if (role === Role.DEPARTMENT_HEAD) {
    const deptHead = await prisma.departmentHead.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!deptHead) {
      throw new AppError(status.NOT_FOUND, "Department Head profile not found");
    }

    queryBuilder.where({
      universityId: deptHead.universityId,
      OR: [{ departmentId: null }, { departmentId: deptHead.departmentId }],
    });
  }

  if (role === Role.COMMITTEE_REVIEWER) {
    const reviewer = await prisma.reviewer.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!reviewer) {
      throw new AppError(status.NOT_FOUND, "Reviewer profile not found");
    }

    queryBuilder.where({ universityId: reviewer.universityId });
  }

  if (role === Role.STUDENT) {
    const student = await prisma.student.findFirst({
      where: { userId, isDeleted: false },
      include: { academicInfo: true },
    });

    if (!student || !student.universityId) {
      throw new AppError(
        status.NOT_FOUND,
        "Student profile not found or not linked to a university"
      );
    }

    queryBuilder.where({
      universityId: student.universityId,
      status: ScholarshipStatus.ACTIVE,
    });
  }

  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .include({
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
    })
    .dynamicInclude(scholarshipIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};


const getScholarshipById = async (
  userId: string,
  role: string,
  scholarshipId: string
) => {
  const scholarship = await prisma.scholarship.findFirst({
    where: {
      id: scholarshipId,
      isDeleted: false,
    },
    include: {
      university: { select: { id: true, name: true, logoUrl: true } },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      applications: {
        where: { isDeleted: false },
        select: {
          id: true,
          status: true,
          student: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
  });

  if (!scholarship) {
    throw new AppError(status.NOT_FOUND, "Scholarship not found");
  }

  if (role === Role.UNIVERSITY_ADMIN) {
    const universityId = await getAdminUniversityId(userId);
    if (scholarship.universityId !== universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view scholarships from your own university"
      );
    }
  }

  if (role === Role.STUDENT) {
    if (scholarship.status !== ScholarshipStatus.ACTIVE) {
      throw new AppError(
        status.FORBIDDEN,
        "This scholarship is not currently active"
      );
    }
  }

  if (role === Role.DEPARTMENT_HEAD) {
    const deptHead = await prisma.departmentHead.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!deptHead) {
      throw new AppError(status.NOT_FOUND, "Department Head profile not found");
    }

    if (scholarship.universityId !== deptHead.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }

    if (
      scholarship.departmentId &&
      scholarship.departmentId !== deptHead.departmentId
    ) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view scholarships for your own department"
      );
    }
  }

  return scholarship;
};


const updateScholarship = async (
  userId: string,
  scholarshipId: string,
  req: Request
) => {
  const universityId = await getAdminUniversityId(userId);
  const file = req.file;

  // Parse body
  const payload = parseScholarshipBody(req.body);

  if (!payload && !file) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const scholarship = await prisma.scholarship.findFirst({
    where: {
      id: scholarshipId,
      isDeleted: false,
    },
  });

  if (!scholarship) {
    throw new AppError(status.NOT_FOUND, "Scholarship not found");
  }

  if (scholarship.universityId !== universityId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update scholarships from your own university"
    );
  }

  if (
    scholarship.status !== ScholarshipStatus.DRAFT &&
    scholarship.status !== ScholarshipStatus.PAUSED
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot update scholarship with status "${scholarship.status}". Only DRAFT or PAUSED scholarships can be updated.`
    );
  }

  // Validate department if being changed
  if (payload.departmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: payload.departmentId,
        universityId,
        isDeleted: false,
      },
    });

    if (!department) {
      throw new AppError(
        status.BAD_REQUEST,
        "Department not found in your university"
      );
    }
  }

  // Validate level if being changed
  if (payload.levelId) {
    const level = await prisma.academicLevel.findFirst({
      where: {
        id: payload.levelId,
        universityId,
        isDeleted: false,
      },
    });

    if (!level) {
      throw new AppError(
        status.BAD_REQUEST,
        "Academic level not found in your university"
      );
    }
  }

  // Build update data
  const updateData: Record<string, any> = {};

  if (payload.title) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.departmentId !== undefined) updateData.departmentId = payload.departmentId;
  if (payload.levelId !== undefined) updateData.levelId = payload.levelId;
  if (payload.totalAmount) updateData.totalAmount = payload.totalAmount;
  if (payload.amountPerStudent) updateData.amountPerStudent = payload.amountPerStudent;
  if (payload.quota) updateData.quota = payload.quota;
  if (payload.deadline) updateData.deadline = new Date(payload.deadline);
  if (payload.requiredDocTypes) updateData.requiredDocTypes = payload.requiredDocTypes;
  if (payload.minGpa !== undefined) updateData.minGpa = payload.minGpa;
  if (payload.minCgpa !== undefined) updateData.minCgpa = payload.minCgpa;
  if (payload.financialNeedRequired !== undefined)
    updateData.financialNeedRequired = payload.financialNeedRequired;

  // Handle document upload
  if (file) {
    // Delete old document from Cloudinary
    if (scholarship.document) {
      await deleteFileFromCloudinary(scholarship.document).catch((err) =>
        console.error("Failed to delete old document:", err.message)
      );
    }

    updateData.document = (file as any).path;
    updateData.documentPublicId = (file as any).filename;
  }

  const updatedScholarship = await prisma.scholarship.update({
    where: { id: scholarshipId },
    data: updateData as Prisma.ScholarshipUpdateInput,
    include: {
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
    },
  });

  return updatedScholarship;
};


const changeScholarshipStatus = async (
  userId: string,
  role: string,
  scholarshipId: string,
  payload: { status: ScholarshipStatus }
) => {
  const newStatus = payload.status;

  const scholarship = await prisma.scholarship.findFirst({
    where: {
      id: scholarshipId,
      isDeleted: false,
    },
  });

  if (!scholarship) {
    throw new AppError(status.NOT_FOUND, "Scholarship not found");
  }

  if (role === Role.UNIVERSITY_ADMIN) {
    const universityId = await getAdminUniversityId(userId);
    if (scholarship.universityId !== universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only manage scholarships from your own university"
      );
    }
  }

  const validTransitions: Record<ScholarshipStatus, ScholarshipStatus[]> = {
    [ScholarshipStatus.DRAFT]: [
      ScholarshipStatus.ACTIVE,
      ScholarshipStatus.CANCELLED,
    ],
    [ScholarshipStatus.ACTIVE]: [
      ScholarshipStatus.PAUSED,
      ScholarshipStatus.CLOSED,
      ScholarshipStatus.CANCELLED,
    ],
    [ScholarshipStatus.PAUSED]: [
      ScholarshipStatus.ACTIVE,
      ScholarshipStatus.CLOSED,
      ScholarshipStatus.CANCELLED,
    ],
    [ScholarshipStatus.CLOSED]: [],
    [ScholarshipStatus.CANCELLED]: [],
  };

  const allowedTransitions = validTransitions[scholarship.status];

  if (!allowedTransitions.includes(newStatus)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot change status from "${scholarship.status}" to "${newStatus}". Allowed: ${
        allowedTransitions.length > 0
          ? allowedTransitions.join(", ")
          : "none (terminal state)"
      }`
    );
  }

  const updatedScholarship = await prisma.scholarship.update({
    where: { id: scholarshipId },
    data: { status: newStatus },
    include: {
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
    },
  });

  return updatedScholarship;
};


const deleteScholarship = async (
  userId: string,
  role: string,
  scholarshipId: string
) => {
  const scholarship = await prisma.scholarship.findFirst({
    where: {
      id: scholarshipId,
      isDeleted: false,
    },
    include: {
      _count: {
        select: {
          applications: {
            where: { isDeleted: false },
          },
        },
      },
    },
  });

  if (!scholarship) {
    throw new AppError(status.NOT_FOUND, "Scholarship not found");
  }

  if (role === Role.UNIVERSITY_ADMIN) {
    const universityId = await getAdminUniversityId(userId);
    if (scholarship.universityId !== universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only delete scholarships from your own university"
      );
    }
  }

  if (scholarship._count.applications > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete scholarship with ${scholarship._count.applications} active application(s). Cancel or close instead.`
    );
  }

  if (
    scholarship.status !== ScholarshipStatus.DRAFT &&
    scholarship.status !== ScholarshipStatus.CANCELLED
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete scholarship with status "${scholarship.status}". Only DRAFT or CANCELLED can be deleted.`
    );
  }

  // Delete document from Cloudinary
  if (scholarship.document) {
    await deleteFileFromCloudinary(scholarship.document).catch((err) =>
      console.error("Failed to delete document:", err.message)
    );
  }

  await prisma.scholarship.update({
    where: { id: scholarshipId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return null;
};

const getPublicScholarships = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Scholarship,
    Prisma.ScholarshipWhereInput,
    Prisma.ScholarshipInclude
  >(prisma.scholarship, query, {
    searchableFields: scholarshipSearchableFields,
    filterableFields: ["universityId", "departmentId", "levelId"],
  });

  const result = await queryBuilder
    .search()
    .filter()
    .where({
      isDeleted: false,
      status: ScholarshipStatus.ACTIVE,
    })
    .include({
      university: { select: { id: true, name: true, logoUrl: true } },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
    })
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

export const ScholarshipService = {
  createScholarship,
  getAllScholarships,
  getScholarshipById,
  updateScholarship,
  changeScholarshipStatus,
  deleteScholarship,
  getPublicScholarships,
};