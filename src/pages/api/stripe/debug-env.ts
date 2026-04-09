import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const runtimeEnv = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env;

  return new Response(
    JSON.stringify(
      {
        runtimeEnvAvailable: Boolean(runtimeEnv),
        hasStripeSecretKeyRuntime: Boolean(runtimeEnv?.STRIPE_SECRET_KEY),
        hasStripePublishableKeyRuntime: Boolean(runtimeEnv?.STRIPE_PUBLISHABLE_KEY),
        hasPublicSiteUrlRuntime: Boolean(runtimeEnv?.PUBLIC_SITE_URL),
        hasStripeSecretKeyBuild: Boolean(import.meta.env.STRIPE_SECRET_KEY),
        hasStripePublishableKeyBuild: Boolean(import.meta.env.STRIPE_PUBLISHABLE_KEY),
        hasPublicSiteUrlBuild: Boolean(import.meta.env.PUBLIC_SITE_URL),
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
