import status from "http-status";
import {
  Role,
  ApplicationStatus,
  ScholarshipStatus,
  DisbursementStatus,
  SubscriptionPaymentStatus,
  UserStatus,
  UniversityStatus,
  StudentAcademicStatus,
} from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

interface IStatsUser {
  userId: string;
  role: string;
  email: string;
}

export interface MonthlyCount {
  month: Date;
  count: number;
}

export interface MonthlyRevenue {
    month: Date;
    total: number;
  }

// MAIN: Route to correct stats function
const getDashboardStats = async (user: IStatsUser) => {
  switch (user.role) {
    case Role.SUPER_ADMIN:
      return getSuperAdminStats();
    case Role.UNIVERSITY_ADMIN:
      return getUniversityAdminStats(user.userId);
    case Role.DEPARTMENT_HEAD:
      return getDepartmentHeadStats(user.userId);
    case Role.COMMITTEE_REVIEWER:
      return getCommitteeReviewerStats(user.userId);
    case Role.STUDENT:
      return getStudentStats(user.userId);
    default:
      throw new AppError(status.BAD_REQUEST, "Invalid user role");
  }
};

// SUPER ADMIN STATS (Platform-wide)
const getSuperAdminStats = async () => {
  const [
    totalUsers,
    totalUniversities,
    totalStudents,
    totalScholarships,
    totalApplications,
    totalDisbursements,
    activeUniversities,
    pendingUniversities,
    activeScholarships,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.university.count({ where: { isDeleted: false } }),
    prisma.student.count({ where: { isDeleted: false } }),
    prisma.scholarship.count({ where: { isDeleted: false } }),
    prisma.application.count({ where: { isDeleted: false } }),
    prisma.disbursement.count(),
    prisma.university.count({
      where: { status: UniversityStatus.APPROVED, isDeleted: false },
    }),
    prisma.university.count({
      where: { status: UniversityStatus.PENDING, isDeleted: false },
    }),
    prisma.scholarship.count({
      where: { status: ScholarshipStatus.ACTIVE, isDeleted: false },
    }),
  ]);

  // Total disbursed amount
  const totalDisbursedAmount = await prisma.disbursement.aggregate({
    _sum: { amount: true },
    where: { status: DisbursementStatus.COMPLETED },
  });

  // Total subscription revenue
  const totalSubscriptionRevenue = await prisma.subscriptionPayment.aggregate({
    _sum: { amount: true },
    where: { status: SubscriptionPaymentStatus.COMPLETED },
  });

  // Role distribution
  const roleDistribution = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
    where: { isDeleted: false },
  });

  const formattedRoleDistribution = roleDistribution.map(
    ({ role, _count }) => ({
      role,
      count: _count.id,
    }),
  );

  // University status distribution (pie chart)
  const universityStatusDistribution = await prisma.university.groupBy({
    by: ["status"],
    _count: { id: true },
    where: { isDeleted: false },
  });

  const formattedUniversityStatus = universityStatusDistribution.map(
    ({ status, _count }) => ({
      status,
      count: _count.id,
    }),
  );

  // User status distribution
  const userStatusDistribution = await prisma.user.groupBy({
    by: ["status"],
    _count: { id: true },
    where: { isDeleted: false },
  });

  const formattedUserStatus = userStatusDistribution.map(
    ({ status, _count }) => ({
      status,
      count: _count.id,
    }),
  );

  // Active vs Banned vs Deleted users
  const activeUsers = await prisma.user.count({
    where: { status: UserStatus.ACTIVE, isDeleted: false },
  });

  const bannedUsers = await prisma.user.count({
    where: { status: UserStatus.BANNED, isDeleted: false },
  });

  const deletedUsers = await prisma.user.count({
    where: { status: UserStatus.DELETED },
  });

  // Application status distribution (pie chart)
  const applicationStatusPie = await getApplicationStatusPieChart();

  // Monthly applications (bar chart)
  const monthlyApplications = await getMonthlyApplicationsBarChart();

  // Monthly revenue (bar chart)
  const monthlyRevenue = await getMonthlyRevenueBarChart();

  return {
    counts: {
      totalUsers,
      totalUniversities,
      activeUniversities,
      pendingUniversities,
      totalStudents,
      totalScholarships,
      activeScholarships,
      totalApplications,
      totalDisbursements,
      activeUsers,
      bannedUsers,
      deletedUsers,
    },
    financials: {
      totalDisbursedAmount: totalDisbursedAmount._sum.amount || 0,
      totalSubscriptionRevenue: totalSubscriptionRevenue._sum.amount || 0,
    },
    charts: {
      roleDistribution: formattedRoleDistribution,
      universityStatusDistribution: formattedUniversityStatus,
      userStatusDistribution: formattedUserStatus,
      applicationStatusPie,
      monthlyApplications,
      monthlyRevenue,
    },
  };
};

// ═══════════════════════════════════════════
// UNIVERSITY ADMIN STATS
// ═══════════════════════════════════════════
const getUniversityAdminStats = async (userId: string) => {
  const admin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      university: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  const universityId = admin.universityId;

  const [
    totalStudents,
    totalDepartments,
    totalScholarships,
    activeScholarships,
    totalApplications,
    totalDisbursements,
    totalDeptHeads,
    totalReviewers,
  ] = await Promise.all([
    prisma.student.count({
      where: { universityId, isDeleted: false },
    }),
    prisma.department.count({
      where: { universityId, isDeleted: false },
    }),
    prisma.scholarship.count({
      where: { universityId, isDeleted: false },
    }),
    prisma.scholarship.count({
      where: {
        universityId,
        status: ScholarshipStatus.ACTIVE,
        isDeleted: false,
      },
    }),
    prisma.application.count({
      where: { universityId, isDeleted: false },
    }),
    prisma.disbursement.count({
      where: { universityId },
    }),
    prisma.departmentHead.count({
      where: { universityId, isDeleted: false },
    }),
    prisma.reviewer.count({
      where: { universityId, isDeleted: false },
    }),
  ]);

  // Pending applications needing action
  const pendingScreening = await prisma.application.count({
    where: {
      universityId,
      status: ApplicationStatus.SCREENING,
      isDeleted: false,
    },
  });

  const pendingReview = await prisma.application.count({
    where: {
      universityId,
      status: ApplicationStatus.UNDER_REVIEW,
      isDeleted: false,
    },
  });

  const approvedApplications = await prisma.application.count({
    where: {
      universityId,
      status: ApplicationStatus.APPROVED,
      isDeleted: false,
    },
  });

  // Total disbursed amount
  const totalDisbursedAmount = await prisma.disbursement.aggregate({
    _sum: { amount: true },
    where: {
      universityId,
      status: DisbursementStatus.COMPLETED,
    },
  });

  // Pending disbursements
  const pendingDisbursements = await prisma.disbursement.count({
    where: {
      universityId,
      status: {
        in: [DisbursementStatus.PENDING, DisbursementStatus.PROCESSING],
      },
    },
  });

  // Student academic status distribution
  const academicStatusDistribution = await prisma.studentAcademicInfo.groupBy({
    by: ["academicStatus"],
    _count: { id: true },
    where: {
      student: {
        universityId,
        isDeleted: false,
      },
      isDeleted: false,
    },
  });

  const formattedAcademicStatus = academicStatusDistribution.map(
    ({ academicStatus, _count }) => ({
      status: academicStatus,
      count: _count.id,
    }),
  );

  // Count by each academic status
  const regularStudents = await prisma.studentAcademicInfo.count({
    where: {
      academicStatus: StudentAcademicStatus.REGULAR,
      student: { universityId, isDeleted: false },
      isDeleted: false,
    },
  });

  const probationStudents = await prisma.studentAcademicInfo.count({
    where: {
      academicStatus: StudentAcademicStatus.PROBATION,
      student: { universityId, isDeleted: false },
      isDeleted: false,
    },
  });

  const suspendedStudents = await prisma.studentAcademicInfo.count({
    where: {
      academicStatus: StudentAcademicStatus.SUSPENDED,
      student: { universityId, isDeleted: false },
      isDeleted: false,
    },
  });

  const droppedOutStudents = await prisma.studentAcademicInfo.count({
    where: {
      academicStatus: StudentAcademicStatus.DROPPED_OUT,
      student: { universityId, isDeleted: false },
      isDeleted: false,
    },
  });

  // User status in university
  const activeUsersInUni = await prisma.user.count({
    where: {
      status: UserStatus.ACTIVE,
      isDeleted: false,
      OR: [
        { admin: { universityId } },
        { student: { universityId } },
        { departmentHead: { universityId } },
        { reviewer: { universityId } },
      ],
    },
  });

  const bannedUsersInUni = await prisma.user.count({
    where: {
      status: UserStatus.BANNED,
      isDeleted: false,
      OR: [
        { admin: { universityId } },
        { student: { universityId } },
        { departmentHead: { universityId } },
        { reviewer: { universityId } },
      ],
    },
  });

  // Application status distribution (pie chart)
  const applicationStatusDistribution = await prisma.application.groupBy({
    by: ["status"],
    _count: { id: true },
    where: { universityId, isDeleted: false },
  });

  const formattedApplicationStatus = applicationStatusDistribution.map(
    ({ status, _count }) => ({
      status,
      count: _count.id,
    }),
  );

  // Scholarship status distribution (pie chart)
  const scholarshipStatusDistribution = await prisma.scholarship.groupBy({
    by: ["status"],
    _count: { id: true },
    where: { universityId, isDeleted: false },
  });

  const formattedScholarshipStatus = scholarshipStatusDistribution.map(
    ({ status, _count }) => ({
      status,
      count: _count.id,
    }),
  );

  // Monthly applications (bar chart)
  const monthlyApplications =
    await getMonthlyApplicationsBarChart(universityId);

  // Top scholarships by applications
  const topScholarships = await prisma.scholarship.findMany({
    where: { universityId, isDeleted: false },
    select: {
      id: true,
      title: true,
      quota: true,
      amountPerStudent: true,
      status: true,
      _count: {
        select: {
          applications: {
            where: { isDeleted: false },
          },
        },
      },
    },
    orderBy: {
      applications: { _count: "desc" },
    },
    take: 5,
  });

  const formattedTopScholarships = topScholarships.map((s) => ({
    id: s.id,
    title: s.title,
    quota: s.quota,
    amountPerStudent: s.amountPerStudent,
    status: s.status,
    applicationCount: s._count.applications,
  }));

  return {
    university: admin.university,
    subscriptionStatus: admin.subscriptionStatus,
    counts: {
      totalStudents,
      totalDepartments,
      totalScholarships,
      activeScholarships,
      totalApplications,
      totalDeptHeads,
      totalReviewers,
      totalDisbursements,
      pendingScreening,
      pendingReview,
      approvedApplications,
      pendingDisbursements,
      regularStudents,
      probationStudents,
      suspendedStudents,
      droppedOutStudents,
      activeUsersInUni,
      bannedUsersInUni,
    },
    financials: {
      totalDisbursedAmount: totalDisbursedAmount._sum.amount || 0,
    },
    charts: {
      applicationStatusDistribution: formattedApplicationStatus,
      scholarshipStatusDistribution: formattedScholarshipStatus,
      academicStatusDistribution: formattedAcademicStatus,
      monthlyApplications,
    },
    topScholarships: formattedTopScholarships,
  };
};

// ═══════════════════════════════════════════
// DEPARTMENT HEAD STATS
// ═══════════════════════════════════════════
const getDepartmentHeadStats = async (userId: string) => {
  const deptHead = await prisma.departmentHead.findFirst({
    where: { userId, isDeleted: false },
    include: {
      department: { select: { id: true, name: true } },
      university: { select: { id: true, name: true } },
    },
  });

  if (!deptHead) {
    throw new AppError(status.NOT_FOUND, "Department Head profile not found");
  }

  const [
    totalStudentsInDept,
    totalScholarshipsForDept,
    activeScholarshipsForDept,
  ] = await Promise.all([
    prisma.studentAcademicInfo.count({
      where: {
        departmentId: deptHead.departmentId,
        isDeleted: false,
      },
    }),
    prisma.scholarship.count({
      where: {
        departmentId: deptHead.departmentId,
        isDeleted: false,
      },
    }),
    prisma.scholarship.count({
      where: {
        departmentId: deptHead.departmentId,
        status: ScholarshipStatus.ACTIVE,
        isDeleted: false,
      },
    }),
  ]);

  // Screening stats
  const pendingScreening = await prisma.application.count({
    where: {
      status: ApplicationStatus.SCREENING,
      scholarship: { departmentId: deptHead.departmentId },
      isDeleted: false,
    },
  });

  const totalScreened = await prisma.applicationScreening.count({
    where: {
      reviewerId: deptHead.id,
      isDeleted: false,
    },
  });

  const screeningPassed = await prisma.applicationScreening.count({
    where: {
      reviewerId: deptHead.id,
      passed: true,
      isDeleted: false,
    },
  });

  const screeningRejected = await prisma.applicationScreening.count({
    where: {
      reviewerId: deptHead.id,
      passed: false,
      isDeleted: false,
    },
  });

  // Application status for department scholarships (pie chart)
  const applicationStatusDistribution = await prisma.application.groupBy({
    by: ["status"],
    _count: { id: true },
    where: {
      scholarship: { departmentId: deptHead.departmentId },
      isDeleted: false,
    },
  });

  const formattedApplicationStatus = applicationStatusDistribution.map(
    ({ status, _count }) => ({
      status,
      count: _count.id,
    }),
  );

  // Student academic status distribution
  const academicStatusDistribution = await prisma.studentAcademicInfo.groupBy({
    by: ["academicStatus"],
    _count: { id: true },
    where: {
      departmentId: deptHead.departmentId,
      isDeleted: false,
    },
  });

  const formattedAcademicStatus = academicStatusDistribution.map(
    ({ academicStatus, _count }) => ({
      status: academicStatus,
      count: _count.id,
    }),
  );

  return {
    department: deptHead.department,
    university: deptHead.university,
    counts: {
      totalStudentsInDept,
      totalScholarshipsForDept,
      activeScholarshipsForDept,
      pendingScreening,
      totalScreened,
      screeningPassed,
      screeningRejected,
    },
    screeningRate:
      totalScreened > 0
        ? Math.round((screeningPassed / totalScreened) * 100)
        : 0,
    charts: {
      applicationStatusDistribution: formattedApplicationStatus,
      academicStatusDistribution: formattedAcademicStatus,
    },
  };
};

// ═══════════════════════════════════════════
// COMMITTEE REVIEWER STATS
// ═══════════════════════════════════════════
const getCommitteeReviewerStats = async (userId: string) => {
  const reviewer = await prisma.reviewer.findFirst({
    where: { userId, isDeleted: false },
    include: {
      university: { select: { id: true, name: true } },
    },
  });

  if (!reviewer) {
    throw new AppError(status.NOT_FOUND, "Reviewer profile not found");
  }

  // My review stats
  const totalReviews = await prisma.applicationReview.count({
    where: {
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  const averageScore = await prisma.applicationReview.aggregate({
    _avg: { totalScore: true },
    where: {
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  const highestScore = await prisma.applicationReview.aggregate({
    _max: { totalScore: true },
    where: {
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  const lowestScore = await prisma.applicationReview.aggregate({
    _min: { totalScore: true },
    where: {
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  // Pending reviews (UNDER_REVIEW apps in university that I haven't reviewed)
  const pendingReviewApplications = await prisma.application.count({
    where: {
      universityId: reviewer.universityId,
      status: ApplicationStatus.UNDER_REVIEW,
      isDeleted: false,
      reviews: {
        none: {
          reviewerId: reviewer.id,
          isDeleted: false,
        },
      },
    },
  });

  // Already reviewed count
  const reviewedApplications = await prisma.application.count({
    where: {
      universityId: reviewer.universityId,
      isDeleted: false,
      reviews: {
        some: {
          reviewerId: reviewer.id,
          isDeleted: false,
        },
      },
    },
  });

  // Score distribution (pie chart — group by score ranges)
  const allMyReviews = await prisma.applicationReview.findMany({
    where: {
      reviewerId: reviewer.id,
      isDeleted: false,
    },
    select: { totalScore: true },
  });

  const scoreDistribution = {
    excellent: allMyReviews.filter((r) => r.totalScore >= 35).length, // 35-40
    good: allMyReviews.filter((r) => r.totalScore >= 25 && r.totalScore < 35)
      .length, // 25-34
    average: allMyReviews.filter((r) => r.totalScore >= 15 && r.totalScore < 25)
      .length, // 15-24
    poor: allMyReviews.filter((r) => r.totalScore < 15).length, // 0-14
  };

  // Average scores breakdown
  const scoreBreakdown = await prisma.applicationReview.aggregate({
    _avg: {
      gpaScore: true,
      essayScore: true,
      financialScore: true,
      criteriaScore: true,
    },
    where: {
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  return {
    university: reviewer.university,
    counts: {
      totalReviews,
      pendingReviewApplications,
      reviewedApplications,
    },
    scores: {
      averageScore: Math.round((averageScore._avg.totalScore || 0) * 100) / 100,
      highestScore: highestScore._max.totalScore || 0,
      lowestScore: lowestScore._min.totalScore || 0,
      maxPossibleScore: 40,
    },
    scoreBreakdown: {
      avgGpaScore: Math.round((scoreBreakdown._avg.gpaScore || 0) * 100) / 100,
      avgEssayScore:
        Math.round((scoreBreakdown._avg.essayScore || 0) * 100) / 100,
      avgFinancialScore:
        Math.round((scoreBreakdown._avg.financialScore || 0) * 100) / 100,
      avgCriteriaScore:
        Math.round((scoreBreakdown._avg.criteriaScore || 0) * 100) / 100,
    },
    charts: {
      scoreDistribution,
    },
  };
};

// ═══════════════════════════════════════════
// STUDENT STATS
// ═══════════════════════════════════════════
const getStudentStats = async (userId: string) => {
  const student = await prisma.student.findFirst({
    where: { userId, isDeleted: false },
    include: {
      university: { select: { id: true, name: true } },
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

  // Application counts
  const totalApplications = await prisma.application.count({
    where: { studentId: student.id, isDeleted: false },
  });

  const draftApplications = await prisma.application.count({
    where: {
      studentId: student.id,
      status: ApplicationStatus.DRAFT,
      isDeleted: false,
    },
  });

  const approvedApplications = await prisma.application.count({
    where: {
      studentId: student.id,
      status: ApplicationStatus.APPROVED,
      isDeleted: false,
    },
  });

  const rejectedApplications = await prisma.application.count({
    where: {
      studentId: student.id,
      status: ApplicationStatus.REJECTED,
      isDeleted: false,
    },
  });

  const disbursedApplications = await prisma.application.count({
    where: {
      studentId: student.id,
      status: ApplicationStatus.DISBURSED,
      isDeleted: false,
    },
  });

  const inProgressApplications = await prisma.application.count({
    where: {
      studentId: student.id,
      status: {
        in: [
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.SCREENING,
          ApplicationStatus.UNDER_REVIEW,
        ],
      },
      isDeleted: false,
    },
  });

  // Total received amount
  const totalReceivedAmount = await prisma.disbursement.aggregate({
    _sum: { amount: true },
    where: {
      studentId: student.id,
      status: DisbursementStatus.COMPLETED,
    },
  });

  // Available scholarships count
  const availableScholarships = await prisma.scholarship.count({
    where: {
      universityId: student.universityId!,
      status: ScholarshipStatus.ACTIVE,
      isDeleted: false,
      deadline: { gt: new Date() },
    },
  });

  // Application status distribution (pie chart)
  const applicationStatusDistribution = await prisma.application.groupBy({
    by: ["status"],
    _count: { id: true },
    where: {
      studentId: student.id,
      isDeleted: false,
    },
  });

  const formattedApplicationStatus = applicationStatusDistribution.map(
    ({ status, _count }) => ({
      status,
      count: _count.id,
    }),
  );

  // Recent applications
  const recentApplications = await prisma.application.findMany({
    where: {
      studentId: student.id,
      isDeleted: false,
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      scholarship: {
        select: {
          id: true,
          title: true,
          amountPerStudent: true,
          deadline: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return {
    university: student.university,
    academicInfo: student.academicInfo,
    counts: {
      totalApplications,
      draftApplications,
      inProgressApplications,
      approvedApplications,
      rejectedApplications,
      disbursedApplications,
      availableScholarships,
    },
    financials: {
      totalReceivedAmount: totalReceivedAmount._sum.amount || 0,
    },
    charts: {
      applicationStatusDistribution: formattedApplicationStatus,
    },
    recentApplications,
  };
};

// ═══════════════════════════════════════════
// SHARED CHART HELPERS
// ═══════════════════════════════════════════

// Application status pie chart
const getApplicationStatusPieChart = async (universityId?: string) => {
  const applicationStatusDistribution = await prisma.application.groupBy({
    by: ["status"],
    _count: { id: true },
    where: {
      ...(universityId && { universityId }),
      isDeleted: false,
    },
  });

  return applicationStatusDistribution.map(({ status, _count }) => ({
    status,
    count: _count.id,
  }));
};

// Monthly applications bar chart
const getMonthlyApplicationsBarChart = async (universityId?: string) => {
  let monthlyApplications: MonthlyCount[];

  if (universityId) {
    monthlyApplications = await prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "submittedAt") AS month,
      CAST(COUNT(*) AS INTEGER) AS count
      FROM "applications"
      WHERE "universityId" = ${universityId}
        AND "isDeleted" = false
        AND "submittedAt" IS NOT NULL
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `;
  } else {
    monthlyApplications = await prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "submittedAt") AS month,
      CAST(COUNT(*) AS INTEGER) AS count
      FROM "applications"
      WHERE "isDeleted" = false
        AND "submittedAt" IS NOT NULL
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `;
  }

  return monthlyApplications;
};

// Monthly revenue bar chart (subscription payments)
const getMonthlyRevenueBarChart = async () => {


  const monthlyRevenue: MonthlyRevenue[] = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "paidAt") AS month,
    CAST(SUM("amount") AS DOUBLE PRECISION) AS total
    FROM "subscription_payments"
    WHERE "status" = 'COMPLETED'
      AND "paidAt" IS NOT NULL
    GROUP BY month
    ORDER BY month ASC
    LIMIT 12
  `;

  return monthlyRevenue;
};

export const StatsService = {
  getDashboardStats,
};
