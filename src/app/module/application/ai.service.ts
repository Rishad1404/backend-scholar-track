import status from "http-status";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { envVars } from "../../../config/env";

const genAI = new GoogleGenerativeAI(envVars.GEMINI_API_KEY as string);

const evaluateApplication = async (userId: string, applicationId: string) => {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, isDeleted: false },
    include: {
      scholarship: true,
      student: { include: { academicInfo: true } },
    },
  });

  if (!application) throw new AppError(status.NOT_FOUND, "Application not found");
  if (application.aiScore !== null)
    throw new AppError(status.BAD_REQUEST, "AI has already evaluated this application");

  const prompt = `
    You are an expert scholarship reviewer. Evaluate this student's application.
    
    Scholarship Requirements:
    - Minimum GPA: ${application.scholarship.minGpa || "None"}
    - Needs Financial Aid: ${application.scholarship.financialNeedRequired ? "Yes" : "No"}
    
    Student Profile:
    - Current GPA: ${application.student.academicInfo?.gpa}
    - Financial Info: ${JSON.stringify(application.financialInfo)}
    - Essay: "${application.essay || "No essay provided"}"

    Respond ONLY in valid JSON format matching this exact structure (do not include markdown tags like \`\`\`json):
    {
      "aiEligible": true or false,
      "aiEligibleReason": "A 1-sentence explanation",
      "aiScore": 85,
      "aiEssayScore": 90,
      "aiSummary": "A 2-sentence summary"
    }
  `;

  // to check if our API key is working and to see available models, you can uncomment this block

  // try {
  //   const fetchResponse = await fetch(
  //     `https://generativelanguage.googleapis.com/v1beta/models?key=${envVars.GEMINI_API_KEY}`,
  //   );
  //   const data = await fetchResponse.json();
  //   console.log("🟢 YOUR AVAILABLE GOOGLE MODELS:");
  //   console.log(
  //     data.models
  //       ?.map((m: any) => m.name)
  //       .filter((name: string) => name.includes("gemini")),
  //   );
  // } catch (e) {
  //   console.log("Could not fetch model list");
  // }

  // 2. Use the newest standard model (gemini-1.5-flash)
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const response = await model.generateContent(prompt);
  let text = response.response.text();

  // 3. Clean the response just in case Google adds markdown code blocks
  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const aiResult = JSON.parse(text);

  // 3. Save to database
  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: {
      aiEligible: aiResult.aiEligible,
      aiEligibleReason: aiResult.aiEligibleReason,
      aiScore: aiResult.aiScore,
      aiEssayScore: aiResult.aiEssayScore,
      aiSummary: aiResult.aiSummary,
    },
  });

  return updatedApplication;
};

export const AiService = { evaluateApplication };
