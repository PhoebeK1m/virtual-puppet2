export async function handler() {
  const hasKey = !!process.env.AZURE_API_KEY;
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: hasKey
        ? "✅ Azure API key is loaded!"
        : "❌ Key is missing — check your environment variable.",
    }),
  };
}
