import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewerService } from "./reviewer.service";
import status from "http-status";

const addReviewer = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await ReviewerService.addReviewer(userId, role, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Committee Reviewer added successfully",
    data: result,
  });
});

const getAllReviewers = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await ReviewerService.getAllReviewers(userId, role);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reviewers fetched successfully",
    data: result,
  });
});

const getReviewerById = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { reviewerId } = req.params;
  const result = await ReviewerService.getReviewerById(userId, role, reviewerId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reviewer fetched successfully",
    data: result,
  });
});

const updateReviewer = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { reviewerId } = req.params;
  const result = await ReviewerService.updateReviewer(
    userId,
    role,
    reviewerId as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reviewer updated successfully",
    data: result,
  });
});

const deleteReviewer = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { reviewerId } = req.params;
  const result = await ReviewerService.deleteReviewer(userId, role, reviewerId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reviewer removed successfully",
    data: result,
  });
});

export const ReviewerController = {
  addReviewer,
  getAllReviewers,
  getReviewerById,
  updateReviewer,
  deleteReviewer,
};