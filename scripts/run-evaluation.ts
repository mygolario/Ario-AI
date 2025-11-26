import fs from "fs";
import path from "path";
type QuestionItem = { category: string; question: string };
type ResultItem = { category: string; question: string; answer: string };

async function main() {
  const questionsPath = path.join(process.cwd(), "evaluation", "questions.json");
  const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8")) as QuestionItem[];

  const results: ResultItem[] = [];

  for (const item of questions) {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: item.question,
        conversationId: null,
        clientId: "evaluation-bot",
      }),
    });

    const data = (await res.json()) as { reply?: string };

    results.push({
      category: item.category,
      question: item.question,
      answer: data.reply ?? "",
    });

    console.log("✓ Answered:", item.question);
  }

  const outPath = path.join(
    process.cwd(),
    "evaluation",
    `raw-responses-${Date.now()}.json`,
  );

  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log("Exported:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
