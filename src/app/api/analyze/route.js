import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY 
});

export async function POST(req) {
  try {
    const { text, existingIssues = [] } = await req.json();

    // 1. Convert existing issues into a searchable string for the AI
    const issuesList = existingIssues.length > 0 
      ? existingIssues.map(issue => `"${issue.title}"`).join(", ") 
      : "None";

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Logic Auditor. Your goal is to keep the database clean.
          
          ### EXISTING DATABASE ENTRIES (DO NOT DUPLICATE):
          [${issuesList}]

          ### REJECTION CRITERIA (BE STRICT):
          - **SIMILARITY**: REJECT if the input is saying the same thing as any entry in the list above , even if phrased differently , but if the context is different and the problem is not the same then ACCEPT it , even if most of the words match an existing entry.
          - for example waiting for a cab is not the same as waiting for a bus or for a vacation , so accpeted those kind "similar" , but waiting for a cab and waiting for a taxi is the same problem and should be rejected if one of them is already in the database.
          - **NOT SOFTWARE**: REJECT if the problem requires physical labor, hardware repair, or manual human action (e.g., "Fix fire trucks", "Paint a wall", "Buy groceries").
          - **TOO VAGUE**: REJECT if it's a general goal without a specific software function (e.g., "Make people happy").
          - **NON-ENGLISH/GIBBERISH**: REJECT if the input is Hebrew, gibberish, or social greetings.

          ### ACCEPTANCE CRITERIA:
          - ONLY ACCEPT if it is a specific problem solvable via a CODE/APP solution (e.g., "A system to log fire truck engine hours").

          ### OUTPUT (JSON ONLY):
          {
            "decision": "CREATE" | "REJECT",
            "reason": "Brutal 1-sentence logic",
            "category": "check if it fits into an existing category or create a new generic one",
            "priority": 0-100,
            "title": "${text}"
          }`
        },
        { role: "user", content: text }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0, 
    });

    const brain = JSON.parse(completion.choices[0].message.content);
    
    // Manual Hebrew/Social filter (Secondary safety net)
    const socialTrash = ['מה קורה', 'מה קשורה', 'שלום', 'היי', 'אהלן', 'בוקר טוב'];
    if (socialTrash.some(word => text.includes(word)) || /[\u0590-\u05FF]/.test(text)) {
      return NextResponse.json({ 
        decision: "REJECT", 
        reason: "Input must be a software problem in English." 
      });
    }

    return NextResponse.json(brain);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ decision: "REJECT", reason: "System Error" }, { status: 500 });
  }
}