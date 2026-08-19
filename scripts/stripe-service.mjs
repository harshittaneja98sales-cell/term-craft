import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import {
  getBillingProfile,
  getBillingProfileByCustomerId,
  upsertBillingProfile,
} from "./billing-store.mjs";

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY?.trim() || process.env.STRIPE_API_KEY?.trim() || "";
const stripePriceId = process.env.STRIPE_PRICE_ID?.trim() || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
const stripePortalReturnPath =
  process.env.STRIPE_PORTAL_RETURN_PATH?.trim() || "/dashboard";
const siteUrl =
  process.env.SITE_URL?.replace(/\/$/, "") || "https://usetermcraft.com";

const activeStatuses = new Set(["active", "trialing"]);

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2026-06-24.dahlia",
    })
  : null;

function idFromStripeValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id ?? "";
}

function randomIntegrationSuffix() {
  return randomBytes(6).toString("base64url").replace(/[^a-z]/gi, "").slice(0, 8).toLowerCase() || "termcraft";
}

function cleanUrlPath(path) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

function getSubscriptionPriceId(subscription) {
  return subscription?.items?.data?.[0]?.price?.id ?? "";
}

function getPlanFromStatus(status) {
  return activeStatuses.has(status) ? "pro" : "free";
}

function profileFromSubscription(subscription, existingProfile = {}) {
  const status = subscription.status ?? "inactive";

  return {
    ...existingProfile,
    stripeCustomerId: idFromStripeValue(subscription.customer) || existingProfile.stripeCustomerId || "",
    stripeSubscriptionId: subscription.id ?? existingProfile.stripeSubscriptionId ?? "",
    plan: getPlanFromStatus(status),
    status,
    priceId: getSubscriptionPriceId(subscription) || existingProfile.priceId || "",
    currentPeriodEnd: subscription.current_period_end || "",
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    trialEnd: subscription.trial_end || "",
  };
}

export function getStripeConfigStatus() {
  return {
    checkoutEnabled: Boolean(stripe && stripePriceId),
    portalEnabled: Boolean(stripe),
    webhookEnabled: Boolean(stripe && stripeWebhookSecret),
    mode: stripeSecretKey.includes("_live_") ? "live" : "test",
  };
}

export function requireStripeCheckoutConfig() {
  if (!stripe) {
    const error = new Error("Stripe test secret key is not configured.");
    error.status = 503;
    throw error;
  }

  if (!stripePriceId) {
    const error = new Error("Stripe test price ID is not configured.");
    error.status = 503;
    throw error;
  }
}

export function requireStripePortalConfig() {
  if (!stripe) {
    const error = new Error("Stripe test secret key is not configured.");
    error.status = 503;
    throw error;
  }
}

export async function ensureStripeCustomer(user) {
  requireStripePortalConfig();

  const existingProfile = await getBillingProfile(user.id);
  if (existingProfile?.stripeCustomerId) {
    return {
      customerId: existingProfile.stripeCustomerId,
      profile: existingProfile,
    };
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    metadata: {
      termcraft_user_id: user.id,
    },
  });
  const profile = await upsertBillingProfile({
    ...(existingProfile ?? {}),
    userId: user.id,
    email: user.email,
    stripeCustomerId: customer.id,
    plan: existingProfile?.plan || "free",
    status: existingProfile?.status || "inactive",
  });

  return { customerId: customer.id, profile };
}

export async function createSubscriptionCheckoutSession(user) {
  requireStripeCheckoutConfig();
  const { customerId } = await ensureStripeCustomer(user);
  const successUrl = `${siteUrl}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${siteUrl}/billing?billing=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata: {
      termcraft_user_id: user.id,
    },
    subscription_data: {
      metadata: {
        termcraft_user_id: user.id,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    integration_identifier: `termcraft_test_billing_${randomIntegrationSuffix()}`,
  });

  return session;
}

export async function createBillingPortalSession(user, returnPath = "") {
  requireStripePortalConfig();
  const { customerId } = await ensureStripeCustomer(user);

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}${cleanUrlPath(returnPath || stripePortalReturnPath)}`,
  });
}

export async function getBillingStatus(user) {
  const profile = await getBillingProfile(user.id);
  const status = profile?.status ?? "inactive";

  return {
    plan: profile?.plan ?? getPlanFromStatus(status),
    status,
    priceId: profile?.priceId ?? "",
    stripeCustomerId: profile?.stripeCustomerId ?? "",
    stripeSubscriptionId: profile?.stripeSubscriptionId ?? "",
    currentPeriodEnd: profile?.currentPeriodEnd ?? "",
    cancelAtPeriodEnd: Boolean(profile?.cancelAtPeriodEnd),
    trialEnd: profile?.trialEnd ?? "",
  };
}

async function updateProfileFromSubscription(subscription) {
  const stripeCustomerId = idFromStripeValue(subscription.customer);
  const profile = await getBillingProfileByCustomerId(stripeCustomerId);
  const userId =
    profile?.userId ||
    subscription.metadata?.termcraft_user_id ||
    "";

  if (!userId) {
    return null;
  }

  return upsertBillingProfile(
    profileFromSubscription(subscription, {
      ...(profile ?? {}),
      userId,
      email: profile?.email ?? "",
    }),
  );
}

async function handleCheckoutSessionCompleted(session) {
  const userId =
    session.client_reference_id ||
    session.metadata?.termcraft_user_id ||
    "";
  const stripeCustomerId = idFromStripeValue(session.customer);
  const stripeSubscriptionId = idFromStripeValue(session.subscription);

  if (!userId) {
    return null;
  }

  let existingProfile = await getBillingProfile(userId);
  let subscription = null;

  if (stripeSubscriptionId) {
    subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  if (subscription) {
    return upsertBillingProfile(
      profileFromSubscription(subscription, {
        ...(existingProfile ?? {}),
        userId,
        email: existingProfile?.email ?? session.customer_details?.email ?? "",
        stripeCustomerId,
      }),
    );
  }

  return upsertBillingProfile({
    ...(existingProfile ?? {}),
    userId,
    email: existingProfile?.email ?? session.customer_details?.email ?? "",
    stripeCustomerId,
    stripeSubscriptionId,
    plan: "pro",
    status: "active",
    priceId: stripePriceId,
  });
}

export async function handleStripeWebhook(rawBody, signature) {
  if (!stripe || !stripeWebhookSecret) {
    const error = new Error("Stripe webhook secret is not configured.");
    error.status = 503;
    throw error;
  }

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    stripeWebhookSecret,
  );

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await updateProfileFromSubscription(event.data.object);
      break;
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subscriptionId = idFromStripeValue(invoice.subscription);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateProfileFromSubscription(subscription);
      }
      break;
    }
    default:
      break;
  }

  return event;
}
