import OpenAI from "openai";

const DEFAULT_BATCH_SIZE = 64;

export function createOpenAIClient(apiKey = process.env.OPENAI_API_KEY) {
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY before building or querying the local vector index.");
  }

  return new OpenAI({ apiKey });
}

export async function embedTexts({
  texts,
  model,
  batchSize = DEFAULT_BATCH_SIZE,
}: {
  texts: string[];
  model: string;
  batchSize?: number;
}) {
  const client = createOpenAIClient();
  const embeddings: number[][] = [];

  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const response = await client.embeddings.create({
      model,
      input: batch,
    });

    embeddings.push(...response.data.map((item) => item.embedding));
  }

  return embeddings;
}

export async function embedText({ text, model }: { text: string; model: string }) {
  const [embedding] = await embedTexts({ texts: [text], model, batchSize: 1 });
  return embedding;
}
