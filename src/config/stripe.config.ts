import Stripe from "stripe";
import { envVars } from "./env";

export const stripe=new Stripe(envVars.STRIPE.STRIPE_SECRET_KEY,{
    apiVersion: "2026-02-25.clover",
})


export const SUBSCRIPTION_PRICES = {
  MONTHLY: {
    amount: 99900, 
    label: "Monthly Subscription",
  },
  YEARLY: {
    amount: 999900, 
    label: "Yearly Subscription",
  },
} as const;

export const PLATFORM_FEE_PERCENTAGE = 2.5; // 2.5%