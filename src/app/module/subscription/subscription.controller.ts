
import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SubscriptionService } from "./subscription.service";
import { IQueryParams } from "../../interfaces/query.interface";

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const result = await SubscriptionService.createCheckoutSession(
      userId,
      req.body
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  }
);

const getSubscriptionStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const result =
      await SubscriptionService.getSubscriptionStatus(userId);
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Subscription status fetched successfully",
      data: result,
    });
  }
);

const getPaymentHistory = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const result = await SubscriptionService.getPaymentHistory(
      userId,
      role,
      req.query as IQueryParams
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Payment history fetched successfully",
      data: result,
    });
  }
);

const cancelSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const result =
      await SubscriptionService.cancelSubscription(userId);
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Subscription cancelled successfully",
      data: result,
    });
  }
);

export const SubscriptionController = {
  createCheckoutSession,
  getSubscriptionStatus,
  getPaymentHistory,
  cancelSubscription,
};