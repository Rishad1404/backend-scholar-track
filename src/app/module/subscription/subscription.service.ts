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
import { subscriptionFilterableFields } from "./subscription.constant";
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
// subscription.service.ts

const createCheckoutSession = async (
  userId: string,
  payload: { plan: SubscriptionPlan },
) => {
  const admin = await getAdminWithUniversity(userId);

  if (admin.subscriptionStatus === SubscriptionStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "You already have an active subscription",
    );
  }

  const priceConfig = SUBSCRIPTION_PRICES[payload.plan];

  let stripeCustomerId = admin.university.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: {
        universityId: admin.universityId,
        adminId: admin.id,
        userId: admin.userId,
      },
    });

    stripeCustomerId = customer.id;

    await prisma.university.update({
      where: { id: admin.universityId },
      data: { stripeCustomerId },
    });
  }

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
            description: `${payload.plan} subscription for ${admin.university?.name}`,
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
    success_url: `${envVars.FRONTEND_URL}/admin/subscription/success?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envVars.FRONTEND_URL}/admin/subscription/success?success=false`,
  });

  // ✅ NO payment record here — only return the checkout URL
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
  stripeInvoiceId?: string,
) => {
  // ✅ First check if already processed (idempotency)
  const existingPayment = await prisma.subscriptionPayment.findFirst({
    where: { stripePaymentId: sessionId },
  });

  if (existingPayment?.status === SubscriptionPaymentStatus.COMPLETED) {
    console.log(`Payment ${sessionId} already processed`);
    return;
  }

  // ✅ Get session details from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session.metadata) {
    console.error("No metadata in session:", sessionId);
    return;
  }

  const { universityId, adminId, plan } = session.metadata;

  // Calculate expiry
  const now = new Date();
  const expiresAt = new Date(now);

  if (plan === SubscriptionPlan.MONTHLY) {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  const priceConfig =
    SUBSCRIPTION_PRICES[plan as keyof typeof SUBSCRIPTION_PRICES];

  await prisma.$transaction([
    // ✅ CREATE payment record (not update)
    existingPayment
      ? prisma.subscriptionPayment.update({
          where: { id: existingPayment.id },
          data: {
            status: SubscriptionPaymentStatus.COMPLETED,
            stripeInvoiceId: stripeInvoiceId || null,
            paidAt: now,
            expiresAt,
          },
        })
      : prisma.subscriptionPayment.create({
          data: {
            universityId,
            adminId,
            plan: plan as SubscriptionPlan,
            amount: priceConfig.amount / 100,
            currency: "BDT",
            status: SubscriptionPaymentStatus.COMPLETED,
            stripePaymentId: sessionId,
            stripeInvoiceId: stripeInvoiceId || null,
            stripeCustomerId: session.customer as string,
            paidAt: now,
            expiresAt,
          },
        }),

    // Activate admin subscription
    prisma.admin.update({
      where: { id: adminId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        isOwner: true,
      },
    }),

    // Update university status if pending
    prisma.university.updateMany({
      where: {
        id: universityId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
      },
    }),
  ]);

  // Notify admin
  const admin = await prisma.admin.findFirst({
    where: { id: adminId },
    select: { userId: true },
  });

  if (admin) {
    await prisma.notification.create({
      data: {
        userId: admin.userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: "Subscription Activated! 🎉",
        message: `Your ${plan} subscription has been activated. It expires on ${expiresAt.toLocaleDateString()}.`,
        link: "/admin/subscription",
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
  query: IQueryParams,
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
    throw new AppError(status.BAD_REQUEST, "No active subscription to cancel");
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
