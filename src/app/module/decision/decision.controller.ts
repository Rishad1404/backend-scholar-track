import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DecisionService } from "./decision.service";

const makeDecision = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { applicationId } = req.params;

    const result = await DecisionService.makeDecision(
      userId,
      role,
      applicationId as string,
      req.body
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message:
        result.decision.status === "APPROVED"
          ? "Application approved successfully"
          : "Application rejected",
      data: result,
    });
  }
);

export const DecisionController = {
  makeDecision,
};