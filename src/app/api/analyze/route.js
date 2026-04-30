import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY 
});

export async function POST(req) {
  try {
    const { text, existingIssues = [] } = await req.json();

    const issuesContext = existingIssues.length > 0 
      ? existingIssues.map(i => `ID: ${i.id} | Title: "${i.title}" | Current Score: ${i.priority}`).join("\n") 
      : "None";

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a deeply cynical, ruthless Software Triage Director. Your job is to aggressively gatekeep priority scores based on REAL-WORLD SURVIVAL. 

          Most user requests are completely unimportant. You must be incredibly stingy with high scores. 

          ### EXISTING BACKLOG (DO NOT DUPLICATE):
          ${issuesContext}

          ### REJECTION CRITERIA (BE STRICT):
          - SIMILARITY: REJECT if it's the exact same core problem as an existing entry.
          - NOT SOFTWARE: REJECT if it requires physical labor, hardware repair, or manual human action.
          - GIBBERISH/VAGUE: REJECT if it's not a tangible software issue or is just a social greeting.

          ### THE HARSH REALITY SCORING RUBRIC:
          - 95-100 (APOCALYPSE): "Life ending". Total system collapse, massive data deletion, catastrophic security breach (e.g., "All user passwords leaked", "Main database dropped"). Should almost never be used.
          - 75-94 (CRITICAL BLOCKER): Core revenue-generating or vital operations are completely halted for everyone, and NO workaround exists (e.g., "Payment gateway is completely down").
          - 40-74 (PAIN POINT): Things we CAN live without for a while, but they cause significant friction, cost money, or waste a lot of time. Workarounds might exist but they suck.
          - 15-39 (NICE TO HAVE): "It would be good if there was a solution for this." Quality of life improvements, minor workflow optimizations, new feature requests that aren't urgent.
          - 0-14 (TRIVIA): Completely unimportant. We can easily live without this forever. Minor cosmetic issues, typos, vanity features, or personal preferences (e.g., "Change the border radius", "Add dark mode").

          ### RECALIBRATION RULE:
          If this new issue proves that older issues are actually less important than previously thought, you MUST lower their scores. Force the backlog to conform to the harsh reality rubric above.

          ### OUTPUT (JSON ONLY):
          {
            "decision": "CREATE" | "REJECT",
            "reason": "Brutal 1-sentence logic justifying your low score or rejection",
            "category": "Epic Name (e.g., 'UI/UX', 'Database', 'Authentication')",
            "priority": <number 0-100 based strictly on the harsh rubric>,
            "recalibrations": [
              { "id": "<id of existing issue>", "newPriority": <number>, "reason": "Why you downgraded/upgraded it" }
            ]
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