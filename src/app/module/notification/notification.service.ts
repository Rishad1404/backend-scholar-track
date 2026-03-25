// src/app/modules/notification/notification.service.ts

import status from "http-status";
import { Prisma, Notification } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  notificationSearchableFields,
  notificationFilterableFields,
} from "./notification.constant";


// GET MY NOTIFICATIONS
const getMyNotifications = async (userId: string, query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Notification,
    Prisma.NotificationWhereInput,
    Prisma.NotificationInclude
  >(prisma.notification, query, {
    searchableFields: notificationSearchableFields,
    filterableFields: notificationFilterableFields,
  });

  const result = await queryBuilder
    .search()
    .filter()
    .where({
      userId,
      isDeleted: false,
    })
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

// GET UNREAD COUNT
const getUnreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
      isDeleted: false,
    },
  });

  return { unreadCount: count };
};

// GET SINGLE NOTIFICATION
const getNotificationById = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
      isDeleted: false,
    },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  // Auto-mark as read when viewed
  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    notification.isRead = true;
  }

  return notification;
};

// MARK SINGLE AS READ
const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
      isDeleted: false,
    },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  if (notification.isRead) {
    return notification;
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updated;
};

// MARK MULTIPLE AS READ
const markMultipleAsRead = async (userId: string, notificationIds: string[]) => {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
      isRead: false,
      isDeleted: false,
    },
    data: { isRead: true },
  });

  return {
    markedAsRead: result.count,
    total: notificationIds.length,
  };
};

// MARK ALL AS READ
const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
      isDeleted: false,
    },
    data: { isRead: true },
  });

  return { markedAsRead: result.count };
};

// DELETE SINGLE NOTIFICATION (Soft Delete)
const deleteNotification = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
      isDeleted: false,
    },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return null;
};

// DELETE ALL NOTIFICATIONS (Soft Delete)
const deleteAllNotifications = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return { deleted: result.count };
};

// DELETE ALL READ NOTIFICATIONS (Soft Delete)
const deleteReadNotifications = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: true,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return { deleted: result.count };
};

export const NotificationService = {
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
