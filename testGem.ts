import { GoogleGenAI } from "@google/genai";

// Make sure your GEMINI_API_KEY is in the environment
const ai = new GoogleGenAI({});

async function main() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Explain how AI works in a few words",
    });

    // response.text contains the model output
    console.log("Gemini says:", response.text);
  } catch (err) {
    console.error("Error calling Gemini API:", err);
  }
}

main();
