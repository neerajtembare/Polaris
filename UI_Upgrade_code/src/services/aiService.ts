import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface AIResponse {
  message: string;
  category?: 'productivity' | 'health' | 'learning' | 'other';
  impact?: number; // 1-10
}

export async function processAchievement(input: string): Promise<AIResponse> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: input,
      config: {
        systemInstruction: `You are Polaris AI, a high-performance productivity architect. 
        The user will log an achievement or activity. 
        Your job is to:
        1. Acknowledge the achievement with a short, punchy, and motivating message (max 15 words).
        2. Categorize the achievement.
        3. Assign a focus impact score (1-10) based on how much this contributes to long-term mastery.
        
        Return the response in JSON format.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "Motivating acknowledgment" },
            category: { 
              type: Type.STRING, 
              enum: ['productivity', 'health', 'learning', 'other'],
              description: "Category of the achievement"
            },
            impact: { type: Type.NUMBER, description: "Impact score from 1 to 10" }
          },
          required: ["message", "category", "impact"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result as AIResponse;
  } catch (error) {
    console.error("AI Processing Error:", error);
    return {
      message: "Achievement logged. System synchronization complete.",
      category: 'other',
      impact: 5
    };
  }
}
