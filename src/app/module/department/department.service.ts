import status from "http-status";
import {
  TCreateDepartmentPayload,
  TUpdateDepartmentPayload,
} from "./department.validation";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Department, Prisma } from "../../../generated/prisma/client";
import { departmentAdminIncludeConfig, departmentFilterableFields, departmentPublicIncludeConfig, departmentSearchableFields } from "./department.constant";

// Helper — get universityId from admin profile
const getUniversityId = async (userId: string, role: string) => {
  if (role === Role.SUPER_ADMIN) return null;

  const admin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  return admin.universityId;
};

const createDepartment = async (
  userId: string,
  role: string,
  payload: TCreateDepartmentPayload,
) => {
  const universityId = await getUniversityId(userId, role);

  if (!universityId) {
    throw new AppError(
      status.BAD_REQUEST,
      "Super Admin must specify a university to create department",
    );
  }

  // Check if department name already exists in this university
  const existing = await prisma.department.findFirst({
    where: {
      universityId,
      name: payload.name,
      isDeleted: false,
    },
  });

  if (existing) {
    throw new AppError(
      status.CONFLICT,
      "Department with this name already exists in your university",
    );
  }

  const department = await prisma.department.create({
    data: {
      name: payload.name,
      universityId,
    },
    include: {
      university: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return department;
};


const getAllDepartments = async (
  userId: string | undefined,
  role: string | undefined,
  query: IQueryParams
) => {
  // 1. Start building the query
  const queryBuilder = new QueryBuilder<
    Department,
    Prisma.DepartmentWhereInput,
    Prisma.DepartmentInclude
  >(prisma.department, query, {
    searchableFields: departmentSearchableFields,
    filterableFields: departmentFilterableFields,
  });

  // 2. Default to Public Include
  let includeConfig = departmentPublicIncludeConfig;

  // 3. Admin Logic
  if (role === Role.SUPER_ADMIN || role === Role.UNIVERSITY_ADMIN) {
    includeConfig = departmentAdminIncludeConfig;

    if (role === Role.UNIVERSITY_ADMIN && userId) {
      const universityId = await getUniversityId(userId, role);
      if (!universityId) {
        throw new AppError(status.NOT_FOUND, "University ID not found");
      }
      // Force filter by university
      queryBuilder.where({ universityId });
    }
  }

  // 4. Execute the query
  // IMPORTANT: Explicitly pass the includeConfig to .execute() 
  // if .dynamicInclude() isn't working as expected.
  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .dynamicInclude(includeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

const getDepartmentsByUniversityId = async (universityId: string) => {
  // Check university exists
  const university = await prisma.university.findFirst({
    where: { id: universityId, isDeleted: false },
  })

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found")
  }

  const departments = await prisma.department.findMany({
    where: {
      universityId,
      isDeleted: false,
    },
    select: {
      id:        true,
      name:      true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  })

  return departments
}

const getDepartmentById = async (
  userId?: string,
  role?: string,
  departmentId?: string,
) => {
  if (!departmentId) {
    throw new AppError(status.BAD_REQUEST, "Department ID is required");
  }

  const department = await prisma.department.findFirst({
    where: { id: departmentId, isDeleted: false },
  });

  if (!department) {
    throw new AppError(status.NOT_FOUND, "Department not found");
  }

  // Super Admin → full data
  if (role === Role.SUPER_ADMIN) {
    const fullDepartment = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false },
      include: {
        university: {
          select: { id: true, name: true },
        },
        departmentHeads: {
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
        _count: {
          select: {
            scholarships: true,
            studentAcademicInfos: true,
          },
        },
      },
    });

    return fullDepartment;
  }

  // University Admin → full data but only their university
  if (role === Role.UNIVERSITY_ADMIN && userId) {
    const universityId = await getUniversityId(userId, role);

    if (department.universityId !== universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to view this department",
      );
    }

    const fullDepartment = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false },
      include: {
        university: {
          select: { id: true, name: true },
        },
        departmentHeads: {
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
        _count: {
          select: {
            scholarships: true,
            studentAcademicInfos: true,
          },
        },
      },
    });

    return fullDepartment;
  }

  // Public / Student → limited data
  const publicDepartment = await prisma.department.findFirst({
    where: { id: departmentId, isDeleted: false },
    select: {
      id: true,
      name: true,
      university: {
        select: { id: true, name: true },
      },
    },
  });

  return publicDepartment;
};

const updateDepartment = async (
  userId: string,
  role: string,
  departmentId: string,
  payload: TUpdateDepartmentPayload,
) => {
  const departmentData = payload.department;

  if (!departmentData) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const department = await prisma.department.findFirst({
    where: { id: departmentId, isDeleted: false },
  });

  if (!department) {
    throw new AppError(status.NOT_FOUND, "Department not found");
  }

  // Permission check
  if (role !== Role.SUPER_ADMIN) {
    const universityId = await getUniversityId(userId, role);
    if (department.universityId !== universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to update this department",
      );
    }
  }

  // Check duplicate name in same university
  if (departmentData.name) {
    const existing = await prisma.department.findFirst({
      where: {
        universityId: department.universityId,
        name: departmentData.name,
        isDeleted: false,
        NOT: { id: departmentId },
      },
    });

    if (existing) {
      throw new AppError(
        status.CONFLICT,
        "Department with this name already exists in your university",
      );
    }
  }

  const updatedDepartment = await prisma.department.update({
    where: { id: departmentId },
    data: {
      ...departmentData,
    },
    include: {
      university: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedDepartment;
};

const deleteDepartment = async (userId: string, role: string, departmentId: string) => {
  const department = await prisma.department.findFirst({
    where: { id: departmentId, isDeleted: false },
  });

  if (!department) {
    throw new AppError(status.NOT_FOUND, "Department not found");
  }

  // Permission check
  if (role !== Role.SUPER_ADMIN) {
    const universityId = await getUniversityId(userId, role);
    if (department.universityId !== universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to delete this department",
      );
    }
  }

  // Check if department has active department heads
  const activeDeptHeads = await prisma.departmentHead.count({
    where: { departmentId, isDeleted: false },
  });

  if (activeDeptHeads > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete department with active department heads. Remove them first.",
    );
  }

  const result = await prisma.department.update({
    where: { id: departmentId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
    include: {
      university: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return result;
};

export const DepartmentService = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  getDepartmentsByUniversityId,
  updateDepartment,
  deleteDepartment,
};
