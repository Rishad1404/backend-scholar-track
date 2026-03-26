/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/application/ai.service.ts

import status from "http-status";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ApplicationStatus,
  NotificationType,
  Role,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { envVars } from "../../../config/env";

const genAI = new GoogleGenerativeAI(envVars.GEMINI_API_KEY as string);

// ═══════════════════════════════════════════
// AI RESPONSE VALIDATION
// ═══════════════════════════════════════════
interface AiEvaluationResult {
  aiEligible: boolean;
  aiEligibleReason: string;
  aiScore: number;
  aiEssayScore: number;
  aiSummary: string;
}

const validateAiResponse = (data: unknown): AiEvaluationResult => {
  const result = data as Record<string, unknown>;

  if (typeof result.aiEligible !== "boolean") {
    throw new Error("AI response missing valid 'aiEligible' (boolean)");
  }
  if (typeof result.aiEligibleReason !== "string") {
    throw new Error("AI response missing valid 'aiEligibleReason' (string)");
  }
  if (typeof result.aiScore !== "number" || result.aiScore < 0 || result.aiScore > 100) {
    throw new Error("AI response missing valid 'aiScore' (0-100)");
  }
  if (
    typeof result.aiEssayScore !== "number" ||
    result.aiEssayScore < 0 ||
    result.aiEssayScore > 100
  ) {
    throw new Error("AI response missing valid 'aiEssayScore' (0-100)");
  }
  if (typeof result.aiSummary !== "string") {
    throw new Error("AI response missing valid 'aiSummary' (string)");
  }

  return {
    aiEligible: result.aiEligible,
    aiEligibleReason: result.aiEligibleReason,
    aiScore: result.aiScore,
    aiEssayScore: result.aiEssayScore,
    aiSummary: result.aiSummary,
  };
};

// ═══════════════════════════════════════════
// EVALUATE APPLICATION
// ═══════════════════════════════════════════
const evaluateApplication = async (
  userId: string,
  role: string,
  applicationId: string,
) => {
  // ── Find application ──
  const application = await prisma.application.findFirst({
    where: { id: applicationId, isDeleted: false },
    include: {
      scholarship: true,
      student: {
        include: {
          academicInfo: {
            include: {
              department: { select: { name: true } },
              level: { select: { name: true } },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  // ── Permission check (single block per role) ──
  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!admin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (application.universityId !== admin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only evaluate applications from your own university",
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
      throw new AppError(
        status.FORBIDDEN,
        "You can only evaluate applications from your own university",
      );
    }

    if (
      application.scholarship.departmentId &&
      application.scholarship.departmentId !== deptHead.departmentId
    ) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only evaluate applications for your department's scholarships",
      );
    }
  }

  // SUPER_ADMIN → no restriction

  // ── Status check ──
  if (
    application.status !== ApplicationStatus.SCREENING &&
    application.status !== ApplicationStatus.UNDER_REVIEW
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot evaluate application with status "${application.status}". Only SCREENING or UNDER_REVIEW applications can be evaluated.`,
    );
  }

  // ── Already evaluated check ──
  if (application.aiScore !== null) {
    throw new AppError(status.BAD_REQUEST, "AI has already evaluated this application");
  }

  // ── Build prompt ──
  const academicInfo = application.student.academicInfo;

  const prompt = `
    You are an expert scholarship reviewer. Evaluate this student's application.
    
    Scholarship Details:
    - Title: ${application.scholarship.title}
    - Description: ${application.scholarship.description || "Not provided"}
    - Minimum GPA: ${application.scholarship.minGpa ?? "None"}
    - Minimum CGPA: ${application.scholarship.minCgpa ?? "None"}
    - Financial Need Required: ${application.scholarship.financialNeedRequired ? "Yes" : "No"}
    - Amount Per Student: ${application.scholarship.amountPerStudent}
    
    Student Profile:
    - Name: ${application.student.user.name}
    - Department: ${academicInfo?.department?.name || "Unknown"}
    - Level: ${academicInfo?.level?.name || "Unknown"}
    - Current GPA: ${academicInfo?.gpa ?? "Not provided"}
    - Current CGPA: ${academicInfo?.cgpa ?? "Not provided"}
    - Credits Completed: ${academicInfo?.creditHoursCompleted ?? "Not provided"}
    - Academic Status: ${academicInfo?.academicStatus ?? "Not provided"}
    
    Application Details:
    - Essay: "${application.essay || "No essay provided"}"
    - Financial Info: ${application.financialInfo ? JSON.stringify(application.financialInfo) : "Not provided"}

    Evaluate the student's eligibility and quality. Score from 0-100.

    Respond ONLY in valid JSON format (no markdown, no code blocks):
    {
      "aiEligible": true or false,
      "aiEligibleReason": "A clear 1-sentence explanation of eligibility decision",
      "aiScore": number between 0-100 representing overall application quality,
      "aiEssayScore": number between 0-100 representing essay quality (0 if no essay),
      "aiSummary": "A concise 2-3 sentence summary of the candidate's strengths and weaknesses"
    }
  `;

  // ── Call Gemini AI ──
  let aiResult: AiEvaluationResult;

  try {
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const response = await model.generateContent(prompt);
    let text = response.response.text();

    // Clean response
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    aiResult = validateAiResponse(parsed);
  } catch (error: any) {
    // If AI fails, don't crash — log and throw clean error
    console.error("AI evaluation failed:", error.message);

    if (error instanceof SyntaxError) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "AI returned an invalid response. Please try again.",
      );
    }

    if (error.message?.includes("AI response missing")) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `AI evaluation error: ${error.message}`,
      );
    }

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "AI evaluation service is temporarily unavailable. Please try again later.",
    );
  }

  // ── Save to database ──
  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: {
      aiEligible: aiResult.aiEligible,
      aiEligibleReason: aiResult.aiEligibleReason,
      aiScore: aiResult.aiScore,
      aiEssayScore: aiResult.aiEssayScore,
      aiSummary: aiResult.aiSummary,
    },
    include: {
      scholarship: {
        select: {
          id: true,
          title: true,
          department: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      },
      student: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  // ── Notify relevant users ──
  // Notify admins that AI evaluation is complete
  const admins = await prisma.admin.findMany({
    where: {
      universityId: application.universityId,
      isDeleted: false,
    },
    select: { userId: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: "AI Evaluation Complete",
        message: `AI has evaluated an application for "${application.scholarship.title}". Score: ${aiResult.aiScore}/100. ${aiResult.aiEligible ? "✅ Eligible" : "❌ Not Eligible"}`,
        link: `/applications/${applicationId}`,
      })),
    });
  }

  return {
    application: updatedApplication,
    aiEvaluation: aiResult,
  };
};

// ═══════════════════════════════════════════
// RE-EVALUATE (Reset + Evaluate Again)
// ═══════════════════════════════════════════
const reEvaluateApplication = async (
  userId: string,
  role: string,
  applicationId: string,
) => {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, isDeleted: false },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  // ── Permission check ──
  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!admin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (application.universityId !== admin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only re-evaluate applications from your own university",
      );
    }
  }

  if (application.aiScore === null) {
    throw new AppError(
      status.BAD_REQUEST,
      "Application has not been evaluated yet. Use evaluate instead.",
    );
  }

  // Reset AI fields
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      aiEligible: null,
      aiEligibleReason: null,
      aiScore: null,
      aiEssayScore: null,
      aiSummary: null,
    },
  });

  // Re-evaluate
  return evaluateApplication(userId, role, applicationId);
};
// ═══════════════════════════════════════════
// GET AI EVALUATION RESULT
// ═══════════════════════════════════════════
const getAiEvaluation = async (userId: string, role: string, applicationId: string) => {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, isDeleted: false },
    select: {
      id: true,
      aiEligible: true,
      aiEligibleReason: true,
      aiScore: true,
      aiEssayScore: true,
      aiSummary: true,
      status: true,
      scholarship: {
        select: {
          id: true,
          title: true,
          universityId: true,
        },
      },
      student: {
        select: {
          id: true,
          userId: true,
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  // ── Access check ──
  if (role === Role.STUDENT) {
    if (application.student.userId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view your own application's AI evaluation",
      );
    }
  }

  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!admin || application.scholarship.universityId !== admin.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  if (application.aiScore === null) {
    throw new AppError(
      status.NOT_FOUND,
      "This application has not been evaluated by AI yet",
    );
  }

  return {
    applicationId: application.id,
    applicationStatus: application.status,
    scholarship: application.scholarship.title,
    student: application.student.user.name,
    aiEvaluation: {
      eligible: application.aiEligible,
      eligibleReason: application.aiEligibleReason,
      overallScore: application.aiScore,
      essayScore: application.aiEssayScore,
      summary: application.aiSummary,
    },
  };
};

export const AiService = {
  evaluateApplication,
  reEvaluateApplication,
  getAiEvaluation,
};
