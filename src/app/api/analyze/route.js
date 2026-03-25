import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { text } = await req.json();
    const GEMINI_KEY = 'AIzaSyCduwNsvDWSjvIf0n-Fx1Z2N1ubx5kdY4I';
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    
    // Shift to the Lite model to bypass the standard Flash 20-request limit
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
      Analyze this input: "${text}"
      
      Rule 1: If the input is random keyboard mashing (e.g., "asdfgh") or complete gibberish, return EXACTLY this JSON:
      {"error": "Unreadable or invalid input. Please enter a real issue."}
      
      Rule 2: Translate non-English input to English. Treat the translation as the primary input.
      
      Rule 3: Invent a broad, general category name (1-2 words max). Avoid hyper-specific tags.
      
      Rule 4: Assign Priority from this exact scale: S, A+, A, B+, B, C+, C, D+, D, F.
      
      Rule 5: Provide a one-sentence reason for the priority.
      
      Return ONLY a raw JSON object. Do not use markdown formatting or backticks. Example:
      {"priority": "A", "category": "Hardware", "reason": "Explanation.", "title": "Translated or original text"}
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}') + 1;
    const cleanJson = responseText.substring(startIndex, endIndex);

    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error) {
    console.error("DEBUG - FULL ERROR:", error);
    return NextResponse.json({ error: `API Crash: ${error.message}` });
  }
}