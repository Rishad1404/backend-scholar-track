import status from "http-status";
import { v2 as cloudinary } from "cloudinary";
import {
  Prisma,
  Role,
  Application,
  ApplicationStatus,
  ScholarshipStatus,
  StudentAcademicStatus,
  DocumentType,
  NotificationType,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  applicationSearchableFields,
  applicationFilterableFields,
  applicationIncludeConfig,
} from "./application.constant";

// Helper: Get student with academic info

const getStudentWithAcademicInfo = async (userId: string) => {
  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
    include: {
      academicInfo: {
        where: { isDeleted: false },
      },
    },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  if (!student.universityId) {
    throw new AppError(status.BAD_REQUEST, "You are not linked to any university");
  }

  if (!student.academicInfo) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please complete your academic info before applying",
    );
  }

  return student;
};


const deleteFromCloudinary = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete from Cloudinary:", publicId, error);
  }
};

// CREATE APPLICATION (DRAFT)
const createApplication = async (
  userId: string,
  payload: {
    scholarshipId: string;
    essay?: string;
    financialInfo?: Prisma.InputJsonValue;
  },
) => {
  const student = await getStudentWithAcademicInfo(userId);

  // ── Validate scholarship ──
  const scholarship = await prisma.scholarship.findFirst({
    where: {
      id: payload.scholarshipId,
      isDeleted: false,
    },
  });

  if (!scholarship) {
    throw new AppError(status.NOT_FOUND, "Scholarship not found");
  }

  if (scholarship.status !== ScholarshipStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "This scholarship is not currently accepting applications",
    );
  }

  if (new Date(scholarship.deadline) < new Date()) {
    throw new AppError(
      status.BAD_REQUEST,
      "The deadline for this scholarship has passed",
    );
  }

  // ── University match ──
  if (scholarship.universityId !== student.universityId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only apply for scholarships from your own university",
    );
  }

  // ── Check duplicate ──
  const existingApplication = await prisma.application.findFirst({
    where: {
      studentId: student.id,
      scholarshipId: scholarship.id,
      isDeleted: false,
    },
  });

  if (existingApplication) {
    throw new AppError(status.CONFLICT, "You have already applied for this scholarship");
  }

  // ── Create draft ──
  const application = await prisma.application.create({
    data: {
      studentId: student.id,
      scholarshipId: scholarship.id,
      universityId: scholarship.universityId,
      status: ApplicationStatus.DRAFT,
      essay: payload.essay,
      financialInfo: payload.financialInfo ?? Prisma.JsonNull, 
    },
    include: {
      scholarship: {
        select: {
          id: true,
          title: true,
          requiredDocTypes: true,
          departmentId: true,
          deadline: true,
        },
      },
      documents: {
        where: { isDeleted: false },
        select: {
          id: true,
          type: true,
          fileUrl: true,
          fileName: true,
        },
      },
    },
  });

  return application;
};

// ═══════════════════════════════════════════
// UPLOAD SINGLE DOCUMENT (existing — no change)
// ═══════════════════════════════════════════
const uploadDocument = async (
  userId: string,
  applicationId: string,
  documentType: DocumentType,
  fileData: {
    fileUrl: string;
    publicId: string;
    fileName: string;
    fileSize: number;
  }
) => {
  const student = await getStudentWithAcademicInfo(userId);

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      studentId: student.id,
      isDeleted: false,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.DRAFT) {
    throw new AppError(
      status.BAD_REQUEST,
      "Can only upload documents to DRAFT applications"
    );
  }

  // Check if document of this type already exists
  const existingDoc = await prisma.applicationDocument.findFirst({
    where: {
      applicationId,
      type: documentType,
      isDeleted: false,
    },
  });

  if (existingDoc) {
    if (existingDoc.publicId) {
      await deleteFromCloudinary(existingDoc.publicId);
    }

    const updatedDoc = await prisma.applicationDocument.update({
      where: { id: existingDoc.id },
      data: {
        fileUrl: fileData.fileUrl,
        publicId: fileData.publicId,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
      },
    });

    return updatedDoc;
  }

  const document = await prisma.applicationDocument.create({
    data: {
      applicationId,
      type: documentType,
      fileUrl: fileData.fileUrl,
      publicId: fileData.publicId,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
    },
  });

  return document;
};

// ═══════════════════════════════════════════
// UPLOAD BULK DOCUMENTS (NEW)
// ═══════════════════════════════════════════
const uploadBulkDocuments = async (
  userId: string,
  applicationId: string,
  types: DocumentType[],
  filesData: {
    fileUrl: string;
    publicId: string;
    fileName: string;
    fileSize: number;
  }[]
) => {
  const student = await getStudentWithAcademicInfo(userId);

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      studentId: student.id,
      isDeleted: false,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.DRAFT) {
    throw new AppError(
      status.BAD_REQUEST,
      "Can only upload documents to DRAFT applications"
    );
  }

  // Validate: types count must match files count
  if (types.length !== filesData.length) {
    // Cleanup uploaded files since we're rejecting
    for (const file of filesData) {
      await deleteFromCloudinary(file.publicId);
    }
    throw new AppError(
      status.BAD_REQUEST,
      `Number of types (${types.length}) must match number of files (${filesData.length})`
    );
  }

  // Check for duplicate types in the request
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size !== types.length) {
    for (const file of filesData) {
      await deleteFromCloudinary(file.publicId);
    }
    throw new AppError(
      status.BAD_REQUEST,
      "Duplicate document types in request. Each type can only appear once."
    );
  }

  // Process each document
  const uploadedDocuments = [];

  for (let i = 0; i < types.length; i++) {
    const documentType = types[i];
    const fileData = filesData[i];

    // Check if document of this type already exists
    const existingDoc = await prisma.applicationDocument.findFirst({
      where: {
        applicationId,
        type: documentType,
        isDeleted: false,
      },
    });

    if (existingDoc) {
      // Replace existing
      if (existingDoc.publicId) {
        await deleteFromCloudinary(existingDoc.publicId);
      }

      const updatedDoc = await prisma.applicationDocument.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl: fileData.fileUrl,
          publicId: fileData.publicId,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
        },
      });

      uploadedDocuments.push(updatedDoc);
    } else {
      // Create new
      const document = await prisma.applicationDocument.create({
        data: {
          applicationId,
          type: documentType,
          fileUrl: fileData.fileUrl,
          publicId: fileData.publicId,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
        },
      });

      uploadedDocuments.push(document);
    }
  }

  return uploadedDocuments;
};

// ═══════════════════════════════════════════
// REMOVE DOCUMENT
// ═══════════════════════════════════════════
const removeDocument = async (
  userId: string,
  applicationId: string,
  documentId: string,
) => {
  const student = await getStudentWithAcademicInfo(userId);

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      studentId: student.id,
      isDeleted: false,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.DRAFT) {
    throw new AppError(
      status.BAD_REQUEST,
      "Can only remove documents from DRAFT applications",
    );
  }

  const document = await prisma.applicationDocument.findFirst({
    where: {
      id: documentId,
      applicationId,
      isDeleted: false,
    },
  });

  if (!document) {
    throw new AppError(status.NOT_FOUND, "Document not found");
  }

  // Cleanup from Cloudinary
  if (document.publicId) {
    await deleteFromCloudinary(document.publicId);
  }

  await prisma.applicationDocument.update({
    where: { id: documentId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return null;
};

// ═══════════════════════════════════════════
// SUBMIT APPLICATION (Core Logic)
// ═══════════════════════════════════════════
const submitApplication = async (userId: string, applicationId: string) => {
  const student = await getStudentWithAcademicInfo(userId);
  const academicInfo = student.academicInfo!;

  // ── Find application with scholarship + docs ──
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      studentId: student.id,
      isDeleted: false,
    },
    include: {
      scholarship: true,
      documents: {
        where: { isDeleted: false },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.DRAFT) {
    throw new AppError(status.BAD_REQUEST, "Only DRAFT applications can be submitted");
  }

  const scholarship = application.scholarship;

  // ═══════════════════════════════════════
  // ELIGIBILITY CHECKS
  // ═══════════════════════════════════════

  // 1. Scholarship still active
  if (scholarship.status !== ScholarshipStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "This scholarship is no longer accepting applications",
    );
  }

  // 2. Deadline not passed
  if (new Date(scholarship.deadline) < new Date()) {
    throw new AppError(
      status.BAD_REQUEST,
      "The deadline for this scholarship has passed",
    );
  }

  // 3. Academic status must be REGULAR
  if (academicInfo.academicStatus !== StudentAcademicStatus.REGULAR) {
    throw new AppError(
      status.BAD_REQUEST,
      `Your academic status is "${academicInfo.academicStatus}". Only students with REGULAR status can apply.`,
    );
  }

  // 4. Department match (if department-specific)
  if (
    scholarship.departmentId &&
    academicInfo.departmentId !== scholarship.departmentId
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      "This scholarship is for a different department",
    );
  }

  // 5. Level match (if level-specific)
  if (scholarship.levelId && academicInfo.levelId !== scholarship.levelId) {
    throw new AppError(
      status.BAD_REQUEST,
      "This scholarship is for a different academic level",
    );
  }

  // 6. GPA requirement
  if (scholarship.minGpa !== null && academicInfo.gpa < scholarship.minGpa) {
    throw new AppError(
      status.BAD_REQUEST,
      `Your GPA (${academicInfo.gpa}) does not meet the minimum requirement (${scholarship.minGpa})`,
    );
  }

  // 7. CGPA requirement
  if (scholarship.minCgpa !== null && academicInfo.cgpa < scholarship.minCgpa) {
    throw new AppError(
      status.BAD_REQUEST,
      `Your CGPA (${academicInfo.cgpa}) does not meet the minimum requirement (${scholarship.minCgpa})`,
    );
  }

  // 8. Financial info (if required)
  if (scholarship.financialNeedRequired && !application.financialInfo) {
    throw new AppError(
      status.BAD_REQUEST,
      "This scholarship requires financial information. Please update your application.",
    );
  }

  // 9. Required documents
  if (scholarship.requiredDocTypes && scholarship.requiredDocTypes.length > 0) {
    const uploadedTypes = application.documents.map((doc) => doc.type);
    const missingDocs = (scholarship.requiredDocTypes as DocumentType[]).filter(
      (reqType) => !uploadedTypes.includes(reqType),
    );

    if (missingDocs.length > 0) {
      throw new AppError(
        status.BAD_REQUEST,
        `Missing required documents: ${missingDocs.join(", ")}`,
      );
    }
  }

  // 10. Quota not full
  const approvedCount = await prisma.application.count({
    where: {
      scholarshipId: scholarship.id,
      status: {
        in: [ApplicationStatus.APPROVED, ApplicationStatus.DISBURSED],
      },
      isDeleted: false,
    },
  });

  if (approvedCount >= scholarship.quota) {
    throw new AppError(
      status.BAD_REQUEST,
      "This scholarship has reached its maximum quota",
    );
  }

  // ═══════════════════════════════════════
  // DETERMINE TARGET STATUS
  // ═══════════════════════════════════════
  //   Has departmentId → SCREENING (dept head reviews first)
  //   No departmentId  → UNDER_REVIEW (skip to committee)
  const targetStatus = scholarship.departmentId
    ? ApplicationStatus.SCREENING
    : ApplicationStatus.UNDER_REVIEW;

  // ── Update application ──
  const submittedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: targetStatus,
      submittedAt: new Date(),
    },
    include: {
      scholarship: {
        select: {
          id: true,
          title: true,
          departmentId: true,
          universityId: true,
          department: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      },
      documents: {
        where: { isDeleted: false },
        select: {
          id: true,
          type: true,
          fileUrl: true,
          fileName: true,
        },
      },
    },
  });

  // ── Notify student ──
  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.APPLICATION_SUBMITTED,
      title: "Application Submitted",
      message: scholarship.departmentId
        ? `Your application for "${scholarship.title}" has been submitted and is now under department screening.`
        : `Your application for "${scholarship.title}" has been submitted and is now under committee review.`,
      link: `/applications/${applicationId}`,
    },
  });

  // ── Notify relevant reviewers ──
  if (scholarship.departmentId) {
    // Department-specific → notify dept heads
    const deptHeads = await prisma.departmentHead.findMany({
      where: {
        departmentId: scholarship.departmentId,
        universityId: scholarship.universityId,
        isDeleted: false,
      },
      select: { userId: true },
    });

    if (deptHeads.length > 0) {
      await prisma.notification.createMany({
        data: deptHeads.map((dh) => ({
          userId: dh.userId,
          type: NotificationType.APPLICATION_SUBMITTED,
          title: "New Application for Screening",
          message: `A new application for "${scholarship.title}" requires your screening.`,
          link: `/applications/${applicationId}`,
        })),
      });
    }
  } else {
    // University-wide → notify committee reviewers
    const reviewers = await prisma.reviewer.findMany({
      where: {
        universityId: scholarship.universityId,
        isDeleted: false,
      },
      select: { userId: true },
    });

    if (reviewers.length > 0) {
      await prisma.notification.createMany({
        data: reviewers.map((r) => ({
          userId: r.userId,
          type: NotificationType.APPLICATION_UNDER_REVIEW,
          title: "New Application for Review",
          message: `A new application for "${scholarship.title}" requires your review.`,
          link: `/applications/${applicationId}`,
        })),
      });
    }
  }

  return submittedApplication;
};

// UPDATE APPLICATION (DRAFT only)

const updateApplication = async (
  userId: string,
  applicationId: string,
  payload: {
    essay?: string;
    financialInfo?: Prisma.InputJsonValue; // ← Changed
  },
) => {
  const student = await getStudentWithAcademicInfo(userId);

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      studentId: student.id,
      isDeleted: false,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.DRAFT) {
    throw new AppError(status.BAD_REQUEST, "Only DRAFT applications can be updated");
  }

  const updateData: Prisma.ApplicationUpdateInput = {};

  if (payload.essay !== undefined) {
    updateData.essay = payload.essay;
  }

  if (payload.financialInfo !== undefined) {
    updateData.financialInfo = payload.financialInfo;
  }

  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: updateData,
    include: {
      scholarship: {
        select: {
          id: true,
          title: true,
          requiredDocTypes: true,
          departmentId: true,
        },
      },
      documents: {
        where: { isDeleted: false },
        select: {
          id: true,
          type: true,
          fileUrl: true,
          fileName: true,
        },
      },
    },
  });

  return updatedApplication;
};

// ═══════════════════════════════════════════
// DELETE APPLICATION (DRAFT only)
// ═══════════════════════════════════════════
const deleteApplication = async (userId: string, applicationId: string) => {
  const student = await getStudentWithAcademicInfo(userId);

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      studentId: student.id,
      isDeleted: false,
    },
    include: {
      documents: {
        where: { isDeleted: false },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.DRAFT) {
    throw new AppError(status.BAD_REQUEST, "Only DRAFT applications can be deleted");
  }

  // Cleanup all docs from Cloudinary
  for (const doc of application.documents) {
    if (doc.publicId) {
      await deleteFromCloudinary(doc.publicId);
    }
  }

  // Soft delete application + documents in transaction
  await prisma.$transaction([
    prisma.applicationDocument.updateMany({
      where: { applicationId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    }),
    prisma.application.update({
      where: { id: applicationId },
      data: { isDeleted: true, deletedAt: new Date() },
    }),
  ]);

  return null;
};

// ═══════════════════════════════════════════
// GET MY APPLICATIONS (Student)
// ═══════════════════════════════════════════
const getMyApplications = async (userId: string, query: IQueryParams) => {
  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student profile not found");
  }

  const queryBuilder = new QueryBuilder<
    Application,
    Prisma.ApplicationWhereInput,
    Prisma.ApplicationInclude
  >(prisma.application, query, {
    searchableFields: ["essay"],
    filterableFields: ["status", "scholarshipId"],
  });

  const result = await queryBuilder
    .search()
    .filter()
    .where({
      studentId: student.id,
      isDeleted: false,
    })
    .include({
      scholarship: {
        select: {
          id: true,
          title: true,
          amountPerStudent: true,
          deadline: true,
          status: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      },
      documents: {
        where: { isDeleted: false },
        select: {
          id: true,
          type: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
        },
      },
      screening: {
        select: {
          id: true,
          passed: true,
          comment: true,
          reviewedAt: true,
        },
      },
    })
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

// ═══════════════════════════════════════════
// GET ALL APPLICATIONS (Role-filtered)
// ═══════════════════════════════════════════
const getAllApplications = async (userId: string, role: string, query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Application,
    Prisma.ApplicationWhereInput,
    Prisma.ApplicationInclude
  >(prisma.application, query, {
    searchableFields: applicationSearchableFields,
    filterableFields: applicationFilterableFields,
  });

  // ── Role-based filtering ──
  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!admin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    queryBuilder.where({ universityId: admin.universityId });
  }

  if (role === Role.DEPARTMENT_HEAD) {
    const deptHead = await prisma.departmentHead.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!deptHead) {
      throw new AppError(status.NOT_FOUND, "Department Head profile not found");
    }

    // Dept head sees applications for their department's scholarships
    // Only SCREENING and later (not DRAFTs)
    queryBuilder.where({
      universityId: deptHead.universityId,
      scholarship: { departmentId: deptHead.departmentId },
      status: {
        in: [
          ApplicationStatus.SCREENING,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.APPROVED,
          ApplicationStatus.REJECTED,
          ApplicationStatus.DISBURSED,
        ],
      },
    });
  }

  if (role === Role.COMMITTEE_REVIEWER) {
    const reviewer = await prisma.reviewer.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!reviewer) {
      throw new AppError(status.NOT_FOUND, "Reviewer profile not found");
    }

    // Reviewer sees only UNDER_REVIEW and later
    queryBuilder.where({
      universityId: reviewer.universityId,
      status: {
        in: [
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.APPROVED,
          ApplicationStatus.REJECTED,
          ApplicationStatus.DISBURSED,
        ],
      },
    });
  }

  // SUPER_ADMIN → no extra filter, sees all

  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .include({
      student: {
        select: {
          id: true,
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
      scholarship: {
        select: {
          id: true,
          title: true,
          amountPerStudent: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      },
    })
    .dynamicInclude(applicationIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

// ═══════════════════════════════════════════
// GET SINGLE APPLICATION
// ═══════════════════════════════════════════
const getApplicationById = async (
  userId: string,
  role: string,
  applicationId: string,
) => {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      isDeleted: false,
    },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          academicInfo: {
            include: {
              department: { select: { id: true, name: true } },
              level: { select: { id: true, name: true } },
              term: { select: { id: true, name: true } },
            },
          },
        },
      },
      scholarship: {
        select: {
          id: true,
          title: true,
          description: true,
          totalAmount: true,
          amountPerStudent: true,
          quota: true,
          deadline: true,
          status: true,
          requiredDocTypes: true,
          departmentId: true,
          universityId: true,
          department: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      },
      documents: {
        where: { isDeleted: false },
        select: {
          id: true,
          type: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
          uploadedAt: true,
        },
      },
      screening: {
        select: {
          id: true,
          passed: true,
          comment: true,
          reviewedAt: true,
          departmentHead: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
      reviews: {
        where: { isDeleted: false },
        select: {
          id: true,
          gpaScore: true,
          essayScore: true,
          financialScore: true,
          criteriaScore: true,
          totalScore: true,
          notes: true,
          submittedAt: true,
          reviewer: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  // ── Role-based access checks ──
  if (role === Role.STUDENT) {
    if (application.student.userId !== userId) {
      throw new AppError(status.FORBIDDEN, "You can only view your own applications");
    }
  }

  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!admin || application.universityId !== admin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view applications from your own university",
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

    if (application.universityId !== deptHead.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }

    if (
      application.scholarship.departmentId &&
      application.scholarship.departmentId !== deptHead.departmentId
    ) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view applications for your department's scholarships",
      );
    }
  }

  if (role === Role.COMMITTEE_REVIEWER) {
    const reviewer = await prisma.reviewer.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!reviewer || application.universityId !== reviewer.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  return application;
};

export const ApplicationService = {
  createApplication,
  uploadDocument,
  uploadBulkDocuments,
  removeDocument,
  submitApplication,
  updateApplication,
  deleteApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
};
