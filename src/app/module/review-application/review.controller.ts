import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";


const submitReview = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { applicationId } = req.params;

    const result = await ReviewService.submitReview(
      userId,
      applicationId as string,
      req.body
    );

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Review submitted successfully",
      data: result,
    });
  }
);

const updateReview = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { applicationId } = req.params;

    const result = await ReviewService.updateReview(
      userId,
      applicationId as string,
      req.body
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Review updated successfully",
      data: result,
    });
  }
);

const getReviewsByApplicationId = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { applicationId } = req.params;

    const result = await ReviewService.getReviewsByApplicationId(
      userId,
      role,
      applicationId as string
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Reviews fetched successfully",
      data: result,
    });
  }
);

const deleteReview = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { applicationId } = req.params;

    await ReviewService.deleteReview(
      userId,
      applicationId as string
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Review deleted successfully",
      data: null,
    });
  }
);

export const ReviewController = {
  submitReview,
  updateReview,
  getReviewsByApplicationId,
  deleteReview,
};