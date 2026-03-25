/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/subscription/subscription.service.ts

import status from "http-status";
import {
  SubscriptionPlan,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
  NotificationType,
  Prisma,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { envVars } from "../../../config/env";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  subscriptionFilterableFields,
} from "./subscription.constant";
import { stripe, SUBSCRIPTION_PRICES } from "../../../config/stripe.config";

// ═══════════════════════════════════════════
// Helper: Get admin with university
// ═══════════════════════════════════════════
const getAdminWithUniversity = async (userId: string) => {
  const admin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      university: true,
    },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  if (!admin.university || admin.university.isDeleted) {
    throw new AppError(status.NOT_FOUND, "University not found");
  }

  return admin;
};

// ═══════════════════════════════════════════
// CREATE CHECKOUT SESSION
// ═══════════════════════════════════════════
const createCheckoutSession = async (
  userId: string,
  payload: { plan: SubscriptionPlan }
) => {
  const admin = await getAdminWithUniversity(userId);

  // Check if already has active subscription
  if (admin.subscriptionStatus === SubscriptionStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "You already have an active subscription"
    );
  }

  const priceConfig = SUBSCRIPTION_PRICES[payload.plan];

  // Get or create Stripe customer-----------------------------------------
  let stripeCustomerId = admin.university.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: admin.userId
        ? undefined
        : undefined,
      metadata: {
        universityId: admin.universityId,
        adminId: admin.id,
        userId: admin.userId,
      },
    });

    stripeCustomerId = customer.id;

    // Save customer ID to university
    await prisma.university.update({
      where: { id: admin.universityId },
      data: { stripeCustomerId },
    });
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `ScholarTrack ${priceConfig.label}`,
            description: `${payload.plan} subscription for ${admin.university.name}`,
          },
          unit_amount: priceConfig.amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "subscription",
      universityId: admin.universityId,
      adminId: admin.id,
      userId: admin.userId,
      plan: payload.plan,
    },
    success_url: `${envVars.FRONTEND_URL}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envVars.FRONTEND_URL}/dashboard/subscription/cancel`,
  });

  // Create PENDING payment record
  await prisma.subscriptionPayment.create({
    data: {
      universityId: admin.universityId,
      adminId: admin.id,
      plan: payload.plan,
      amount: priceConfig.amount / 100, // Store in BDT, not poisha
      currency: "BDT",
      status: SubscriptionPaymentStatus.PENDING,
      stripePaymentId: session.id,
      stripeCustomerId,
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
};

// ═══════════════════════════════════════════
// HANDLE SUCCESSFUL PAYMENT (Called by webhook)
// ═══════════════════════════════════════════
const handlePaymentSuccess = async (
  sessionId: string,
  stripeInvoiceId?: string
) => {
  // Find payment record
  const payment = await prisma.subscriptionPayment.findFirst({
    where: { stripePaymentId: sessionId },
  });

  if (!payment) {
    console.error(
      `Subscription payment not found for session: ${sessionId}`
    );
    return;
  }

  if (payment.status === SubscriptionPaymentStatus.COMPLETED) {
    console.log(`Payment ${sessionId} already processed`);
    return;
  }

  // Calculate expiry
  const now = new Date();
  const expiresAt = new Date(now);

  if (payment.plan === SubscriptionPlan.MONTHLY) {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  // Update payment + admin subscription status in transaction
  await prisma.$transaction([
    // Update payment record
    prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: SubscriptionPaymentStatus.COMPLETED,
        stripeInvoiceId: stripeInvoiceId || null,
        paidAt: now,
        expiresAt,
      },
    }),

    // Activate admin subscription
    prisma.admin.update({
      where: { id: payment.adminId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    }),

    // Update university status if pending
    prisma.university.updateMany({
      where: {
        id: payment.universityId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
      },
    }),
  ]);

  // Notify admin
  const admin = await prisma.admin.findFirst({
    where: { id: payment.adminId },
    select: { userId: true },
  });

  if (admin) {
    await prisma.notification.create({
      data: {
        userId: admin.userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: "Subscription Activated! 🎉",
        message: `Your ${payment.plan} subscription has been activated. It expires on ${expiresAt.toLocaleDateString()}.`,
        link: "/dashboard/subscription",
      },
    });
  }
};

// ═══════════════════════════════════════════
// HANDLE PAYMENT FAILURE (Called by webhook)
// ═══════════════════════════════════════════
const handlePaymentFailure = async (sessionId: string) => {
  const payment = await prisma.subscriptionPayment.findFirst({
    where: { stripePaymentId: sessionId },
  });

  if (!payment) return;

  await prisma.subscriptionPayment.update({
    where: { id: payment.id },
    data: {
      status: SubscriptionPaymentStatus.FAILED,
    },
  });
};

// ═══════════════════════════════════════════
// GET SUBSCRIPTION STATUS
// ═══════════════════════════════════════════
const getSubscriptionStatus = async (userId: string) => {
  const admin = await getAdminWithUniversity(userId);

  // Get latest payment
  const latestPayment = await prisma.subscriptionPayment.findFirst({
    where: {
      adminId: admin.id,
      status: SubscriptionPaymentStatus.COMPLETED,
    },
    orderBy: { paidAt: "desc" },
  });

  // Check if expired
  if (
    latestPayment?.expiresAt &&
    new Date(latestPayment.expiresAt) < new Date() &&
    admin.subscriptionStatus === SubscriptionStatus.ACTIVE
  ) {
    // Auto-expire
    await prisma.admin.update({
      where: { id: admin.id },
      data: { subscriptionStatus: SubscriptionStatus.EXPIRED },
    });

    return {
      status: SubscriptionStatus.EXPIRED,
      plan: latestPayment.plan,
      paidAt: latestPayment.paidAt,
      expiresAt: latestPayment.expiresAt,
      university: {
        id: admin.university.id,
        name: admin.university.name,
      },
    };
  }

  return {
    status: admin.subscriptionStatus,
    plan: latestPayment?.plan || null,
    paidAt: latestPayment?.paidAt || null,
    expiresAt: latestPayment?.expiresAt || null,
    university: {
      id: admin.university.id,
      name: admin.university.name,
    },
  };
};

// ═══════════════════════════════════════════
// GET PAYMENT HISTORY
// ═══════════════════════════════════════════
const getPaymentHistory = async (
  userId: string,
  role: string,
  query: IQueryParams
) => {
  const queryBuilder = new QueryBuilder<
    any,
    Prisma.SubscriptionPaymentWhereInput,
    Prisma.SubscriptionPaymentInclude
  >(prisma.subscriptionPayment, query, {
    searchableFields: [],
    filterableFields: subscriptionFilterableFields,
  });

  if (role === "UNIVERSITY_ADMIN") {
    const admin = await getAdminWithUniversity(userId);
    queryBuilder.where({ universityId: admin.universityId });
  }

  // SUPER_ADMIN sees all

  const result = await queryBuilder
    .search()
    .filter()
    .include({
      university: {
        select: { id: true, name: true },
      },
      admin: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    })
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

// ═══════════════════════════════════════════
// CANCEL SUBSCRIPTION
// ═══════════════════════════════════════════
const cancelSubscription = async (userId: string) => {
  const admin = await getAdminWithUniversity(userId);

  if (admin.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "No active subscription to cancel"
    );
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { subscriptionStatus: SubscriptionStatus.CANCELLED },
  });

  await prisma.notification.create({
    data: {
      userId: admin.userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: "Subscription Cancelled",
      message:
        "Your subscription has been cancelled. You can still use the platform until your current period expires.",
      link: "/dashboard/subscription",
    },
  });

  return { message: "Subscription cancelled successfully" };
};

export const SubscriptionService = {
  createCheckoutSession,
  handlePaymentSuccess,
  handlePaymentFailure,
  getSubscriptionStatus,
  getPaymentHistory,
  cancelSubscription,
};