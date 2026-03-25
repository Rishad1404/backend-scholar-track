// src/app/modules/screening/screening.controller.ts

import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ScreeningService } from "./screening.service";

const screenApplication = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { applicationId } = req.params;

    const result = await ScreeningService.screenApplication(
      userId,
      applicationId as string,
      req.body
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: result.screening.passed
        ? "Application screening passed. Forwarded to committee review."
        : "Application screening rejected.",
      data: result,
    });
  }
);

const getScreeningByApplicationId = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { applicationId } = req.params;

    const result = await ScreeningService.getScreeningByApplicationId(
      userId,
      role,
      applicationId as string
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Screening result fetched successfully",
      data: result,
    });
  }
);

export const ScreeningController = {
  screenApplication,
  getScreeningByApplicationId,
};