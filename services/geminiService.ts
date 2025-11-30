import { GoogleGenAI, Type } from "@google/genai";
import { SplitRange } from "../types";

const initGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getSmartSplitSuggestions = async (
  prompt: string,
  totalPages: number
): Promise<SplitRange[]> => {
  const ai = initGemini();
  if (!ai) {
    throw new Error("Gemini API not configured");
  }

  const systemInstruction = `
    You are a PDF processing assistant.
    Your goal is to interpret the user's natural language request for splitting a document and convert it into specific page ranges.
    The document has ${totalPages} pages.
    Return a JSON array of ranges. Each range object must have 'start', 'end', and 'label'.
    Ensure 'start' and 'end' are numbers within 1 to ${totalPages}.
    Ensure ranges do not overlap unless specifically requested (which is rare for splitting).
    If the request is vague, make a best guess based on standard logical splits (e.g., equal parts).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.INTEGER },
              end: { type: Type.INTEGER },
              label: { type: Type.STRING },
            },
            required: ["start", "end", "label"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const rawRanges = JSON.parse(text) as { start: number; end: number; label: string }[];
    
    // Transform to internal SplitRange format with IDs and colors
    return rawRanges.map((r, index) => ({
      id: `ai-range-${Date.now()}-${index}`,
      start: r.start,
      end: r.end,
      label: r.label,
      color: '', // Colors will be assigned by the component
    }));

  } catch (error) {
    console.error("Gemini Smart Split Error:", error);
    throw new Error("Failed to generate smart split suggestions.");
  }
};
