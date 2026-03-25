// src/app/modules/notification/notification.controller.ts

import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { NotificationService } from "./notification.service";
import { IQueryParams } from "../../interfaces/query.interface";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await NotificationService.getMyNotifications(
    userId,
    req.query as IQueryParams,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications fetched successfully",
    data: result,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await NotificationService.getUnreadCount(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Unread count fetched successfully",
    data: result,
  });
});

const getNotificationById = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { notificationId } = req.params;
  const result = await NotificationService.getNotificationById(
    userId,
    notificationId as string,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification fetched successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { notificationId } = req.params;
  const result = await NotificationService.markAsRead(userId, notificationId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markMultipleAsRead = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await NotificationService.markMultipleAsRead(
    userId,
    req.body.notificationIds,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await NotificationService.markAllAsRead(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { notificationId } = req.params;
  await NotificationService.deleteNotification(userId, notificationId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification deleted successfully",
    data: null,
  });
});

const deleteAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await NotificationService.deleteAllNotifications(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All notifications deleted successfully",
    data: result,
  });
});

const deleteReadNotifications = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await NotificationService.deleteReadNotifications(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Read notifications deleted successfully",
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteReadNotifications,
};
