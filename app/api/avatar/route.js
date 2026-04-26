// npm install express node-fetch cors
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ❗ 절대 깃에 올리지 마
const OPENAI_API_KEY = "OPENAI_API_KEY";

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "너는 귀엽고 장난기 많은 3D 캐릭터야. 짧고 귀엽게 말해."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.json({ reply });
  } catch (e) {
    res.json({ reply: "에러났어 😢" });
  }
});

app.listen(3000, () => console.log("http://localhost:3000"));