import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const MAX_GLOBAL_REQUESTS = 20;

export async function handler(event) {
  const allowedOrigin = "https://virtual-puppet.netlify.app";
  const origin = event.headers.origin;

  // Handle preflight (CORS OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "OK",
    };
  }

  // Block if origin is not allowed
  if (origin !== allowedOrigin) {
    return {
      statusCode: 403,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({ error: "Forbidden: invalid origin" }),
    };
  }

  // Allowed headers for actual response
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    // Check global request limit
    const count = await redis.incr("global_request_count");
    console.log("Global request count =", count);

    if (count > MAX_GLOBAL_REQUESTS) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: "I probably ran out of credits :(",
        }),
      };
    }

    // if limit not hit, then call openai api
    const azureResponse = await fetch(
      "https://virtual-puppet-resource.cognitiveservices.azure.com/openai/deployments/gpt-4o-2024-08-06-ft-8ba822937c0a498f8636591cb9f56c7b/chat/completions?api-version=2025-01-01-preview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_API_KEY,
        },
        body: event.body,
      }
    );

    const data = await azureResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
