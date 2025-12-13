import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  class: String,
  history: [
    {
      sender: String,
      text: String,
      time: Number,
    },
  ],
  quizzesTaken: { type: Number, default: 0 },
});

export default mongoose.models.User || mongoose.model("User", userSchema);
