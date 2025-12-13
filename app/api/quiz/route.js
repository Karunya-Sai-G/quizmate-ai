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
You are QuizMate AI, developed by Karunya.
-Your main tasks are to only:
Help the user with generating quizes
Clear doubts on academic-related subjects
Use Emojis by default while talking.
User: ${username}
Class: ${user.class}

Conversation:
${user.history.slice(-10).map(h => `${h.sender}: ${h.text}`).join("\n")}
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
