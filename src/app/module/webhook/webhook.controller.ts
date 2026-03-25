/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/webhook/webhook.controller.ts

import { Request, Response } from "express";
import Stripe from "stripe";
import { envVars } from "../../../config/env";
import { SubscriptionService } from "../subscription/subscription.service";
import { stripe } from "../../../config/stripe.config";

export const webhookHandler = async (
  req: Request,
  res: Response
) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("Webhook: No stripe-signature header");
    return res.status(400).json({ error: "No signature" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      envVars.STRIPE.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // ── Handle events ──
  try {
    switch (event.type) {
      // ─── Subscription Payment Success ───
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === "subscription") {
          console.log(
            `✅ Subscription payment successful: ${session.id}`
          );
          await SubscriptionService.handlePaymentSuccess(
            session.id,
            session.invoice as string | undefined
          );
        }
        break;
      }

      // ─── Payment Failed ───
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === "subscription") {
          console.log(`❌ Subscription payment expired: ${session.id}`);
          await SubscriptionService.handlePaymentFailure(session.id);
        }
        break;
      }

      // ─── Stripe Transfer Success (Disbursement) ───
      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log(`💸 Transfer created: ${transfer.id}`);
        // Could update disbursement status here
        break;
      }

      case "transfer.reversed": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log(`🔄 Transfer reversed: ${transfer.id}`);
        // Could handle reversal
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error);
    // Still return 200 to prevent Stripe from retrying
  }

  res.status(200).json({ received: true });
};