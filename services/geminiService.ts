
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Initialize GoogleGenAI with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getGateExplanation(gateType: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `อธิบายหลักการทำงานของ Logic Gate ประเภท ${gateType} เป็นภาษาไทยสั้นๆ เข้าใจง่าย พร้อมยกตัวอย่าง Truth Table เล็กน้อย`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
            },
            description: {
              type: Type.STRING,
            },
            truthTable: {
              type: Type.STRING,
            },
          },
          required: ["title", "description", "truthTable"],
        },
      },
    });
    // Fix: Access response.text as a property and parse the JSON output
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function checkCircuitChallenge(challenge: string, circuitDescription: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ตรวจสอบว่าวงจรนี้: "${circuitDescription}" ตอบโจทย์ท้าทาย: "${challenge}" หรือไม่? ตอบเป็นภาษาไทยสั้นๆ ว่าถูกหรือผิดและเพราะอะไร`,
    });
    // Fix: Access response.text as a property
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "ไม่สามารถตรวจสอบได้";
  }
}
