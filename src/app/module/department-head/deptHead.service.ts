import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { sendEmail } from "../../utils/email";
import { envVars } from "../../../config/env";
import {
  TAddDepartmentHeadPayload,
  TUpdateDepartmentHeadPayload,
} from "./deptHead.validation";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { DepartmentHead, Prisma } from "../../../generated/prisma/client";
import {
  departmentHeadFilterableFields,
  departmentHeadIncludeConfig,
  departmentHeadSearchableFields,
} from "./deptHead.constant";

const addDepartmentHead = async (
  userId: string,
  role: string,
  payload: TAddDepartmentHeadPayload,
) => {
  const { name, email, password, departmentId, phone, designation } = payload;

  // 1. Find current admin
  const currentAdmin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  // 2. Only Owner Admin or Super Admin
  if (role !== Role.SUPER_ADMIN && !currentAdmin.isOwner) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the owner admin can add department heads",
    );
  }

  // 3. Check email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "Email already registered");
  }

  // 4. Verify department exists and belongs to admin's university
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      universityId: currentAdmin.universityId,
      isDeleted: false,
    },
  });

  if (!department) {
    throw new AppError(
      status.NOT_FOUND,
      "Department not found in your university",
    );
  }

  // 5. Check if department already has an active head
  const existingHead = await prisma.departmentHead.findFirst({
    where: {
      departmentId,
      isDeleted: false,
    },
  });

  if (existingHead) {
    throw new AppError(
      status.CONFLICT,
      "This department already has an active Department Head",
    );
  }

  // 6. Create User via better-auth
  const data = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  if (!data.user) {
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create user");
  }

  // 7. Transaction — set role + create profile
  const result = await prisma
    .$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.user.id },
        data: {
          role: Role.DEPARTMENT_HEAD,
          needPasswordChange: true,
        },
      });

      const deptHead = await tx.departmentHead.create({
        data: {
          userId: data.user.id,
          universityId: currentAdmin.universityId,
          departmentId,
          phone,
          designation,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
          university: {
            select: { id: true, name: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
      });

      return deptHead;
    })
    .catch(async (err) => {
      await prisma.user.delete({ where: { id: data.user.id } }).catch(() => {});
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Failed to create department head: ${err.message}`,
      );
    });

  // 8. Send welcome email with temporary password
  const adminUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  sendEmail({
    to: email,
    subject: `You've been added as Department Head — ScholarTrack`,
    templateName: "deptHeadAdded",
    templateData: {
      name,
      email,
      password,
      universityName: result.university.name,
      departmentName: result.department.name,
      addedByName: adminUser?.name || "Admin",
      loginUrl: `${envVars.FRONTEND_URL}/login`,
    },
  }).catch((err) =>
    console.error("Dept head welcome email failed:", err.message),
  );

  return result;
};

const getAllDepartmentHeads = async (
  userId: string,
  role: string,
  query: IQueryParams,
) => {
  const queryBuilder = new QueryBuilder<
    DepartmentHead,
    Prisma.DepartmentHeadWhereInput,
    Prisma.DepartmentHeadInclude
  >(prisma.departmentHead, query, {
    searchableFields: departmentHeadSearchableFields,
    filterableFields: departmentHeadFilterableFields,
  });

  // 🛡️ RBAC Logic: Lock University Admins to their specific university ID.
  // Super Admins bypass this block and can query all Department Heads.
  if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    // Force the query to ONLY return Department Heads from their university
    queryBuilder.where({ universityId: currentAdmin.universityId });
  }

  // Execute the chained query builder
  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .dynamicInclude(departmentHeadIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

const deleteDepartmentHead = async (
  userId: string,
  role: string,
  deptHeadId: string,
) => {
  const deptHead = await prisma.departmentHead.findFirst({
    where: { id: deptHeadId, isDeleted: false },
  });

  if (!deptHead) {
    throw new AppError(status.NOT_FOUND, "Department Head not found");
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
        "Only the owner admin can remove department heads",
      );
    }

    if (deptHead.universityId !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only remove department heads from your university",
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.departmentHead.update({
      where: { id: deptHeadId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: deptHead.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    await tx.session.deleteMany({
      where: { userId: deptHead.userId },
    });

    return await tx.departmentHead.findUnique({
      where: { id: deptHeadId },
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
        department: {
          select: { id: true, name: true },
        },
      },
    });
  });

  return result;
};

const getDepartmentHeadById = async (
  userId: string,
  role: string,
  deptHeadId: string,
) => {
  const deptHead = await prisma.departmentHead.findFirst({
    where: { id: deptHeadId, isDeleted: false },
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
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  if (!deptHead) {
    throw new AppError(status.NOT_FOUND, "Department Head not found");
  }

  // ✅ Department Head can only view self
  if (role === Role.DEPARTMENT_HEAD) {
    if (deptHead.userId !== userId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
    return deptHead;
  }

  // ✅ Super admin can view all
  if (role === Role.SUPER_ADMIN) {
    return deptHead;
  }

  // ✅ University admin can view within their university
  const currentAdmin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  if (deptHead.universityId !== currentAdmin.universityId) {
    throw new AppError(status.FORBIDDEN, "Access denied");
  }

  return deptHead;
};

const updateDepartmentHead = async (
  userId: string,
  role: string,
  deptHeadId: string,
  payload: TUpdateDepartmentHeadPayload,
) => {
  const deptHeadData = payload.departmentHead;

  if (!deptHeadData) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const deptHead = await prisma.departmentHead.findFirst({
    where: { id: deptHeadId, isDeleted: false },
  });

  if (!deptHead) {
    throw new AppError(status.NOT_FOUND, "Department Head not found");
  }

  const isSelf = deptHead.userId === userId;

  // ✅ Department Head can only update self (no admin lookup)
  if (role === Role.DEPARTMENT_HEAD) {
    if (!isSelf) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  // ✅ Super Admin can update anything
  else if (role !== Role.SUPER_ADMIN) {
    // University admin rules
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    // Owner admin OR the dept head themselves can update
    if (!currentAdmin.isOwner && !isSelf) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to update this department head",
      );
    }

    if (
      currentAdmin.isOwner &&
      deptHead.universityId !== currentAdmin.universityId
    ) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only update department heads from your university",
      );
    }
  }

  const { name, ...deptHeadFields } = deptHeadData;

  const result = await prisma.$transaction(async (tx) => {
    // ✅ Update user name first so include returns the latest name
    if (name) {
      await tx.user.update({
        where: { id: deptHead.userId },
        data: { name },
      });
    }

    const updatedDeptHead = await tx.departmentHead.update({
      where: { id: deptHeadId },
      data: { ...deptHeadFields },
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
        university: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return updatedDeptHead;
  });

  return result;
};

export const DepartmentHeadService = {
  addDepartmentHead,
  getAllDepartmentHeads,
  getDepartmentHeadById,
  updateDepartmentHead,
  deleteDepartmentHead,
};
