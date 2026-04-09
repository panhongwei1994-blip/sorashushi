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

const stripeKey = import.meta.env.STRIPE_SECRET_KEY;

export const POST: APIRoute = async ({ request }) => {
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
  const origin = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;
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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${origin}${langPath}/checkout/success?order=${orderCode}&fulfillment=${payload.checkout.fulfillment}&payment=stripe`,
    cancel_url: `${origin}${langPath}/checkout/cancel`,
    customer_email: undefined,
    billing_address_collection: payload.checkout.fulfillment === "delivery" ? "required" : "auto",
    metadata: {
      orderCode,
      customerName: payload.checkout.name,
      customerPhone: payload.checkout.phone,
      fulfillment: payload.checkout.fulfillment,
      address: payload.checkout.address || "",
    },
  });

  return new Response(JSON.stringify({ url: session.url, orderCode }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
