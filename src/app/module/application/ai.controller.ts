// src/app/modules/application/ai.controller.ts

import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AiService } from "./ai.service";

const evaluateApplication = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { applicationId } = req.params;

    const result = await AiService.evaluateApplication(
      userId,
      role,
      applicationId as string
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "AI evaluation completed successfully",
      data: result,
    });
  }
);

const reEvaluateApplication = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { applicationId } = req.params;

    const result = await AiService.reEvaluateApplication(
      userId,
      role,
      applicationId as string
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "AI re-evaluation completed successfully",
      data: result,
    });
  }
);

const getAiEvaluation = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { applicationId } = req.params;

    const result = await AiService.getAiEvaluation(
      userId,
      role,
      applicationId as string
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "AI evaluation fetched successfully",
      data: result,
    });
  }
);

export const AiController = {
  evaluateApplication,
  reEvaluateApplication,
  getAiEvaluation,
};