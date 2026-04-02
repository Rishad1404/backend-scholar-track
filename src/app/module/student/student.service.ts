/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from "express";
import {
  TCompleteProfilePayload,
  TUpdateProfilePayload,
  TCompleteAcademicInfoPayload,
  TUpdateAcademicInfoPayload,
} from "./student.validation";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { deleteFileFromCloudinary } from "../../../config/cloudinary.config";
import { prisma } from "../../lib/prisma";
import { Role } from "../../../generated/prisma/enums";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Prisma, Student } from "../../../generated/prisma/client";
import { studentFilterableFields, studentIncludeConfig, studentSearchableFields } from "./student.constant";



const completeProfile = async (userId: string, payload: TCompleteProfilePayload) => {
  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  // Check if already completed
  if (student.universityId && student.gender) {
    throw new AppError(
      status.BAD_REQUEST,
      "Profile already completed. Use update profile instead.",
    );
  }

  // Verify university exists and is approved
  const university = await prisma.university.findFirst({
    where: {
      id: payload.universityId,
      isDeleted: false,
      status: "APPROVED",
    },
  });

  if (!university) {
    throw new AppError(status.NOT_FOUND, "University not found or not approved");
  }

  const updatedStudent = await prisma.student.update({
    where: { id: student.id },
    data: {
      universityId: payload.universityId,
      gender: payload.gender,
      dateOfBirth: new Date(payload.dateOfBirth),
      bloodGroup: payload.bloodGroup,
      phone: payload.phone,
      address: payload.address,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      university: {
        select: { id: true, name: true },
      },
    },
  });

  return updatedStudent;
};

const updateProfile = async (
  userId: string,
  payload: TUpdateProfilePayload
) => {
  const studentData = payload.student;

  if (!studentData) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  const updateData: Record<string, any> = {};

  if (studentData.name) updateData.name = studentData.name;
  if (studentData.gender) updateData.gender = studentData.gender;
  if (studentData.dateOfBirth)
    updateData.dateOfBirth = new Date(studentData.dateOfBirth);
  if (studentData.bloodGroup) updateData.bloodGroup = studentData.bloodGroup;
  if (studentData.phone) updateData.phone = studentData.phone;
  if (studentData.address) updateData.address = studentData.address;

  const result = await prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.student.update({
      where: { id: student.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        university: {
          select: { id: true, name: true },
        },
        academicInfo: true,
      },
    });

    if (studentData.name) {
      await tx.user.update({
        where: { id: userId },
        data: { name: studentData.name },
      });
    }

    return updatedStudent;
  });

  return result;
};

const uploadProfilePhoto = async (userId: string, req: Request) => {
  const file = req.file;

  if (!file) {
    throw new AppError(status.BAD_REQUEST, "No photo provided");
  }

  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  // Delete old photo
  if (student.profilePhoto) {
    await deleteFileFromCloudinary(student.profilePhoto).catch((err) =>
      console.error("Failed to delete old photo:", err.message),
    );
  }

  const updatedStudent = await prisma.student.update({
    where: { id: student.id },
    data: {
      profilePhoto: (file as any).path,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedStudent;
};

const getMyProfile = async (userId: string) => {
  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
        },
      },
      university: {
        select: { id: true, name: true, logoUrl: true },
      },
      academicInfo: {
        include: {
          department: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          term: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  return student;
};


const completeAcademicInfo = async (
  userId: string,
  payload: TCompleteAcademicInfoPayload,
) => {
  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  // Check profile is completed first
  if (!student.universityId) {
    throw new AppError(status.BAD_REQUEST, "Please complete your profile first");
  }

  // Check if academic info already exists
  const existingInfo = await prisma.studentAcademicInfo.findFirst({
    where: { studentId: student.id },
  });

  if (existingInfo) {
    throw new AppError(
      status.BAD_REQUEST,
      "Academic info already exists. Use update instead.",
    );
  }

  // Verify department belongs to student's university
  const department = await prisma.department.findFirst({
    where: {
      id: payload.departmentId,
      universityId: student.universityId,
      isDeleted: false,
    },
  });

  if (!department) {
    throw new AppError(status.NOT_FOUND, "Department not found in your university");
  }

  // Verify level exists
  const level = await prisma.academicLevel.findFirst({
    where: { id: payload.levelId, isDeleted: false },
  });

  if (!level) {
    throw new AppError(status.NOT_FOUND, "Academic level not found");
  }

  // Verify term exists
  const term = await prisma.academicTerm.findFirst({
    where: { id: payload.termId, isDeleted: false },
  });

  if (!term) {
    throw new AppError(status.NOT_FOUND, "Academic term not found");
  }

  const academicInfo = await prisma.studentAcademicInfo.create({
    data: {
      studentId: student.id,
      departmentId: payload.departmentId,
      levelId: payload.levelId,
      termId: payload.termId,
      studentIdNo: payload.studentIdNo,
      gpa: payload.gpa,
      cgpa: payload.cgpa,
      creditHoursCompleted: payload.creditHoursCompleted || 0,
    },
    include: {
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      term: { select: { id: true, name: true } },
    },
  });

  return academicInfo;
};

const updateAcademicInfo = async (
  userId: string,
  payload: TUpdateAcademicInfoPayload,
) => {
  const infoData = payload.academicInfo;

  if (!infoData) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  const academicInfo = await prisma.studentAcademicInfo.findFirst({
    where: { studentId: student.id, isDeleted: false },
  });

  if (!academicInfo) {
    throw new AppError(
      status.NOT_FOUND,
      "Academic info not found. Please complete it first.",
    );
  }

  // Verify department if changing
  if (infoData.departmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: infoData.departmentId,
        universityId: student.universityId!,
        isDeleted: false,
      },
    });

    if (!department) {
      throw new AppError(status.NOT_FOUND, "Department not found in your university");
    }
  }

  // Verify level if changing
  if (infoData.levelId) {
    const level = await prisma.academicLevel.findFirst({
      where: { id: infoData.levelId, isDeleted: false },
    });

    if (!level) {
      throw new AppError(status.NOT_FOUND, "Academic level not found");
    }
  }

  // Verify term if changing
  if (infoData.termId) {
    const term = await prisma.academicTerm.findFirst({
      where: { id: infoData.termId, isDeleted: false },
    });

    if (!term) {
      throw new AppError(status.NOT_FOUND, "Academic term not found");
    }
  }

  const updatedInfo = await prisma.studentAcademicInfo.update({
    where: { id: academicInfo.id },
    data: {
      ...infoData,
    },
    include: {
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      term: { select: { id: true, name: true } },
    },
  });

  return updatedInfo;
};


const getAllStudents = async (
  userId: string,
  role: string,
  query: IQueryParams
) => {
  const queryBuilder = new QueryBuilder<
    Student,
    Prisma.StudentWhereInput,
    Prisma.StudentInclude
  >(prisma.student, query, {
    searchableFields: studentSearchableFields,
    filterableFields: studentFilterableFields,
  });

  // Role-based filtering
  if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    queryBuilder.where({ universityId: currentAdmin.universityId });
  }

  if (role === Role.DEPARTMENT_HEAD) {
    const deptHead = await prisma.departmentHead.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!deptHead) {
      throw new AppError(status.NOT_FOUND, "Department Head profile not found");
    }

    queryBuilder.where({
      academicInfo: { departmentId: deptHead.departmentId },
    });
  }

  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .include({
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
      academicInfo: {
        include: {
          department: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          term: { select: { id: true, name: true } },
        },
      },
    })
    .dynamicInclude(studentIncludeConfig)
    .paginate()
    .sort()
    // .fields()
    .execute();

  return result;
};

const getStudentById = async (userId: string, role: string, studentId: string) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, isDeleted: false },
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
        select: { id: true, name: true, logoUrl: true },
      },
      academicInfo: {
        include: {
          department: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          term: { select: { id: true, name: true } },
        },
      },
      applications: {
        where: { isDeleted: false },
        select: {
          id: true,
          status: true,
          scholarship: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student not found");
  }

  // Student viewing self
  if (role === Role.STUDENT) {
    if (student.userId !== userId) {
      throw new AppError(status.FORBIDDEN, "You can only view your own profile");
    }
    return student;
  }

  // Super Admin → can view any
  if (role === Role.SUPER_ADMIN) {
    return student;
  }

  // University Admin → own university only
  if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (student.universityId !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view students from your university",
      );
    }

    return student;
  }

  // Department Head → own department only
  if (role === Role.DEPARTMENT_HEAD) {
    const deptHead = await prisma.departmentHead.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!deptHead) {
      throw new AppError(status.NOT_FOUND, "Department Head profile not found");
    }

    const studentAcademicInfo = await prisma.studentAcademicInfo.findFirst({
      where: { studentId: student.id },
    });

    if (studentAcademicInfo?.departmentId !== deptHead.departmentId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view students from your department",
      );
    }

    return student;
  }

  throw new AppError(status.FORBIDDEN, "You don't have permission");
};

const changeAcademicStatus = async (
  userId: string,
  role: string,
  studentId: string,
  newStatus: string
) => {
  // 1. Find student
  const student = await prisma.student.findFirst({
    where: { id: studentId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student not found");
  }

  // 2. Find academic info
  const academicInfo = await prisma.studentAcademicInfo.findFirst({
    where: { studentId: student.id, isDeleted: false },
  });

  if (!academicInfo) {
    throw new AppError(status.NOT_FOUND, "Student academic info not found");
  }

  // 3. Permission checks
  if (role === Role.SUPER_ADMIN) {
    // Can change anything — no restriction
  } else if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (student.universityId !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only manage students from your university"
      );
    }
  } else if (role === Role.DEPARTMENT_HEAD) {
    const deptHead = await prisma.departmentHead.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!deptHead) {
      throw new AppError(status.NOT_FOUND, "Department Head profile not found");
    }

    // Must be same department
    if (academicInfo.departmentId !== deptHead.departmentId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only manage students from your department"
      );
    }

    // Dept Head can only set REGULAR or PROBATION
    if (newStatus === "SUSPENDED" || newStatus === "DROPPED_OUT") {
      throw new AppError(
        status.FORBIDDEN,
        "Only university admin can suspend or drop out students"
      );
    }
  } else {
    throw new AppError(status.FORBIDDEN, "You don't have permission");
  }

  // 4. Validate status transition
  const currentStatus = academicInfo.academicStatus;
  const validTransitions: Record<string, string[]> = {
    REGULAR: ["PROBATION", "SUSPENDED", "DROPPED_OUT"],
    PROBATION: ["REGULAR", "SUSPENDED", "DROPPED_OUT"],
    SUSPENDED: ["REGULAR"],
    DROPPED_OUT: [], // Cannot change from DROPPED_OUT
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot change status from ${currentStatus} to ${newStatus}`
    );
  }

  // 5. Update status
  const updatedInfo = await prisma.studentAcademicInfo.update({
    where: { id: academicInfo.id },
    data: {
      academicStatus: newStatus as any,
    },
    include: {
      student: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
    },
  });

  // 6. If SUSPENDED or DROPPED_OUT → kill sessions
  if (newStatus === "SUSPENDED" || newStatus === "DROPPED_OUT") {
    await prisma.session.deleteMany({
      where: { userId: student.userId },
    });
  }

  return updatedInfo;
};

const deleteStudent = async (userId: string, role: string, studentId: string) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student not found");
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
      throw new AppError(status.FORBIDDEN, "Only the owner admin can delete students");
    }

    if (student.universityId !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only delete students from your university",
      );
    }
  }

  // Delete profile photo from Cloudinary
  if (student.profilePhoto) {
    await deleteFileFromCloudinary(student.profilePhoto).catch((err) =>
      console.error("Failed to delete photo:", err.message),
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Soft delete student
    await tx.student.update({
      where: { id: studentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Soft delete academic info
    await tx.studentAcademicInfo
      .updateMany({
        where: { studentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })
      .catch(() => {});

    // Soft delete user
    await tx.user.update({
      where: { id: student.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    // Kill sessions
    await tx.session.deleteMany({
      where: { userId: student.userId },
    });

    return await tx.student.findUnique({
      where: { id: studentId },
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
      },
    });
  });

  return result;
};

export const StudentService = {
  completeProfile,
  updateProfile,
  uploadProfilePhoto,
  getMyProfile,
  completeAcademicInfo,
  updateAcademicInfo,
  getAllStudents,
  getStudentById,
  changeAcademicStatus,
  deleteStudent,
};
