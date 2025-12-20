import connectDB from "@/lib/mongo";
import User from "@/lib/userModel";
import axios from "axios";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { username, userClass, message } = body;

    let user = await User.findOne({ username });

    if (!user) {
      user = new User({
        username,
        class: userClass,
        history: [],
        quizzesTaken: 0,
      });
    }

    user.history.push({
      sender: "user",
      text: message,
      time: Date.now(),
    });

    await user.save();

const systemPrompt = `
You are QuizMate AI, an educational assistant created by Karunya Sai G.

STRICT RULES (must follow):
- You ONLY help students with learning.
- You ONLY:
  • generate quizzes
  • explain academic concepts
  • clarify doubts related to studies
  • use emojis to make learning enjoyable
  • You may provide the user with basic info like time, date, etc.
- You MUST NOT:
  • chat casually
  • talk about unrelated topics
  • roleplay
  • act like a general chatbot
- If a question is unrelated to studies, politely refuse and guide the user back to learning.

Student details:
Name: ${username}
Class: ${user.class}

Recent conversation (for context only):
${user.history
  .slice(-10)
  .map(h => `${h.sender.toUpperCase()}: ${h.text}`)
  .join("\n")}
`;


    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiReply = response.data.choices[0].message.content;

    user.history.push({
      sender: "ai",
      text: aiReply,
      time: Date.now(),
    });

    await user.save();

    return new Response(
      JSON.stringify({ reply: aiReply }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500 }
    );
  }
}
