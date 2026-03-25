import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: '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' });

export async function POST(req) {
  try {
    const { text, existingIssues = [] } = await req.json();

    // --- חסימה ידנית ראשונית (לפני ה-AI) ---
    const cleanText = text.trim().toLowerCase();
    
    // חסימת שטויות קצרות (כמו "l" או "j")
    if (cleanText.length < 3) {
      return NextResponse.json({ decision: "REJECT", reason: "Input is too short/nonsense." });
    }

    // חסימת אלימות בסיסית (כמו "kill")
    const bannedWords = ['kill', 'death', 'murder', 'hit'];
    if (bannedWords.some(word => cleanText.includes(word))) {
      return NextResponse.json({ decision: "REJECT", reason: "Safety violation: Violence is not allowed." });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Strict Database Manager. 
          DATABASE: ${JSON.stringify(existingIssues)}

          MANDATORY RULES:
          1. REJECT if: greetings (hi, hello, מה קורה), gibberish, or jokes.
          2. DEDUPLICATE: If the input is semantically the same as an issue in the DATABASE above, REJECT.
          3. CATEGORY: You MUST provide a 1-word broad category.
          4. TITLE: Use the exact user input: "${text}".

          JSON ONLY RESPONSE:
          {
            "decision": "CREATE" | "REJECT",
            "category": "string",
            "priority": "S/A/B/C/F",
            "reason": "short explanation",
            "title": "string"
          }`
        },
        { role: "user", content: text }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0, 
    });

    const brain = JSON.parse(completion.choices[0].message.content);
    return NextResponse.json(brain);
  } catch (error) {
    return NextResponse.json({ decision: "REJECT", reason: "System Error" });
  }
}