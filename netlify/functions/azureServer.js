export async function handler(event) {
  // ✅ Replace with your actual Netlify site URL
  const allowedOrigin = "https://your-site-name.netlify.app"; 
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

  // Deny if origin doesn’t match
  if (origin !== allowedOrigin) {
    return {
      statusCode: 403,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({ error: "Forbidden: invalid origin" }),
    };
  }

  // Allowed CORS headers for actual response
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // ✅ Forward to Azure OpenAI API
  try {
    const azureResponse = await fetch(
      "https://YOUR_RESOURCE_NAME.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT_NAME/chat/completions?api-version=2024-06-01",
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
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
