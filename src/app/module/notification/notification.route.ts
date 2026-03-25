// src/app/modules/notification/notification.route.ts

import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { NotificationController } from "./notification.controller";
import { NotificationValidation } from "./notification.validation";

const router = Router();

// All routes need authentication (any role)
const allRoles = [
  Role.SUPER_ADMIN,
  Role.UNIVERSITY_ADMIN,
  Role.DEPARTMENT_HEAD,
  Role.COMMITTEE_REVIEWER,
  Role.STUDENT,
];

// ── Get my notifications (with search, filter, pagination) ──
router.get("/", checkAuth(...allRoles), NotificationController.getMyNotifications);

// ── Get unread count (for badge) ──
router.get(
  "/unread-count",
  checkAuth(...allRoles),
  NotificationController.getUnreadCount,
);

// ── Mark all as read ──
router.patch(
  "/mark-all-read",
  checkAuth(...allRoles),
  NotificationController.markAllAsRead,
);

// ── Mark multiple as read ──
router.patch(
  "/mark-multiple-read",
  checkAuth(...allRoles),
  validateRequest(NotificationValidation.markMultipleAsReadSchema),
  NotificationController.markMultipleAsRead,
);

// ── Delete all notifications ──
router.delete(
  "/delete-all",
  checkAuth(...allRoles),
  NotificationController.deleteAllNotifications,
);

// ── Delete read notifications ──
router.delete(
  "/delete-read",
  checkAuth(...allRoles),
  NotificationController.deleteReadNotifications,
);

// ── Get single notification (auto-marks as read) ──
router.get(
  "/:notificationId",
  checkAuth(...allRoles),
  NotificationController.getNotificationById,
);

// ── Mark single as read ──
router.patch(
  "/:notificationId/read",
  checkAuth(...allRoles),
  NotificationController.markAsRead,
);

// ── Delete single notification ──
router.delete(
  "/:notificationId",
  checkAuth(...allRoles),
  NotificationController.deleteNotification,
);

export const NotificationRoutes = router;
