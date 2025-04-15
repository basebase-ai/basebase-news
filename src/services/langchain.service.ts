import { ChatAnthropic } from "@langchain/anthropic";

const model = process.env.ANTHROPIC_MODEL;
if (!model) {
  throw new Error("ANTHROPIC_MODEL environment variable is required");
}

export class LangChainService {
  private readonly model: ChatAnthropic;

  constructor() {
    const apiKey: string = process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.model = new ChatAnthropic({
      modelName: model,
      anthropicApiKey: apiKey,
    });
  }

  public async askAi(message: string): Promise<string> {
    try {
      console.log("LangChain: Sending request to Anthropic");
      console.log("LangChain: Message length:", message.length);
      const response = await this.model.invoke(message);
      console.log("LangChain: Response type:", typeof response.content);
      console.log("LangChain: Response length:", response.content.length);
      return response.content.toString();
    } catch (error) {
      console.error("LangChain: Error calling Anthropic API:", error);
      throw error;
    }
  }
}
