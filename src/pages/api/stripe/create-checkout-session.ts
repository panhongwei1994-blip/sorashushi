import type { APIRoute } from "astro";
import Stripe from "stripe";

export const prerender = false;

type CheckoutPayload = {
  lang?: string;
  cart: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    image: string;
    addOnLabels: string[];
    notes: string;
  }>;
  checkout: {
    name: string;
    phone: string;
    address?: string;
    fulfillment: "delivery" | "pickup";
    payment: "stripe" | "cash";
  };
  deliveryFee: number;
};

export const POST: APIRoute = async ({ request, locals }) => {
  const runtimeEnv = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env;
  const stripeKey = runtimeEnv?.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;
  const siteUrl = runtimeEnv?.PUBLIC_SITE_URL ?? import.meta.env.PUBLIC_SITE_URL;

  if (!stripeKey) {
    return new Response(JSON.stringify({
      error:
        "Stripe key missing. Add STRIPE_SECRET_KEY in your Cloudflare Pages Variables and Secrets, then redeploy.",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = (await request.json()) as CheckoutPayload;
  if (!payload?.cart?.length) {
    return new Response(JSON.stringify({ error: "Cart is empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey);
  const origin = siteUrl || new URL(request.url).origin;
  const langPath = payload.lang && payload.lang !== "en" ? `/${payload.lang}` : "";
  const orderCode = `${payload.checkout.fulfillment === "pickup" ? "PK" : "DL"}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const lineItems = payload.cart.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        images: item.image ? [`${origin}${item.image}`] : undefined,
        description: [item.addOnLabels.join(" · "), item.notes].filter(Boolean).join(" | ") || undefined,
      },
      unit_amount: Math.round(item.unitPrice * 100),
    },
  }));

  if (payload.deliveryFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: {
          name: "Delivery Fee",
          images: undefined,
          description: undefined,
        },
        unit_amount: Math.round(payload.deliveryFee * 100),
      },
    });
  }

  const sessionParams = {
    ui_mode: "embedded",
    mode: "payment",
    line_items: lineItems,
    return_url: `${origin}${langPath}/checkout/success?order=${orderCode}&fulfillment=${payload.checkout.fulfillment}&payment=stripe&session_id={CHECKOUT_SESSION_ID}`,
    customer_email: undefined,
    redirect_on_completion: "never",
    billing_address_collection: payload.checkout.fulfillment === "delivery" ? "required" : "auto",
    metadata: {
      orderCode,
      customerName: payload.checkout.name,
      customerPhone: payload.checkout.phone,
      fulfillment: payload.checkout.fulfillment,
      address: payload.checkout.address || "",
    },
  } as Record<string, unknown>;

  const session = await stripe.checkout.sessions.create(sessionParams as never);

  return new Response(JSON.stringify({
    clientSecret: session.client_secret,
    publishableKey: runtimeEnv?.STRIPE_PUBLISHABLE_KEY ?? import.meta.env.STRIPE_PUBLISHABLE_KEY,
    orderCode,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
