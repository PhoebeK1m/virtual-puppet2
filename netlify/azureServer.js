export async function handler(event) {
  try {
    // Forward the frontend request to Azure API
    const azureResponse = await fetch(
      "https://virtual-puppet.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT_NAME/chat/completions?api-version=2024-06-01",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_API_KEY, // secret!
        },
        body: event.body, // send the same JSON the frontend sent
      }
    );

    const data = await azureResponse.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
