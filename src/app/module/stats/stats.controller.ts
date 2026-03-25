import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { StatsService } from "./stats.service";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const { userId, role, email } = req.user!;

  const result = await StatsService.getDashboardStats({
    userId,
    role,
    email,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard stats fetched successfully",
    data: result,
  });
});

export const StatsController = {
  getDashboardStats,
};
