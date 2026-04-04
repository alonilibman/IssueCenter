import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY 
});

export async function POST(req) {
  try {
    const { text, existingIssues = [] } = await req.json();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Logic-Based Database Auditor. 
          STRICT FILTERS:
          1. REJECT if: The input is a greeting (e.g., "מה קורה", "hi"), social talk, non english , or random letters. These are NOT issues.
          2. DEDUPLICATION RULES:
             - Conceptual similarity is NOT enough to reject. 
             - Only REJECT as a duplicate if the new input means the EXACT same thing as an existing issue.
             - Example: "Too many poor people" and "People are too wealthy" are OPPOSITES. They are both UNIQUE issues. Do NOT merge or reject them.
             - Example: "My car won't start" and "Engine failure" are the SAME. REJECT.

          3. TITLE: Use the exact user input: "${text}".

          RESPONSE SCHEMA (JSON ONLY):
          {
            "decision": "CREATE" | "REJECT",
            "reason": "Short logic-based explanation",
            "category": "One word (e.g., Society, Tech, Personal)",
            "priority": "a mark from 0 to 100 indicating importance",
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
    
    // מעצור ידני נוסף לשפה חברתית בעברית
    const socialTrash = ['מה קורה', 'מה קשורה', 'שלום', 'היי', 'אהלן'];
    if (socialTrash.some(word => text.includes(word))) {
      return NextResponse.json({ decision: "REJECT", reason: "Social greeting detected." });
    }

    return NextResponse.json(brain);
  } catch (error) {
    return NextResponse.json({ decision: "REJECT", reason: "System Error" });
  }
}