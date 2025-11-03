import express from 'express';
import cors from 'cors';
import { AzureOpenAI } from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const endpoint = "https://virtual-puppet-resource.cognitiveservices.azure.com/";
const apiKey = "<your-api-key>";
const apiVersion = "2024-04-01-preview";
const deployment = "gpt-4o-2024-08-06-ft-8ba822937c0a498f8636591cb9f56c7b";

const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userMessage }
      ],
      model: "gpt-4o",
      max_tokens: 1000,
      temperature: 1,
      stream: false
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
