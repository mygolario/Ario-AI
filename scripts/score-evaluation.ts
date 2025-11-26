import fs from "fs";
import path from "path";
import { generateLLMReply, type ChatMessage } from "../src/core/llm";

type RawItem = {
  category: string;
  question: string;
  answer: string;
};

type ScoreRecord = RawItem & {
  scores: {
    accuracy: number | null;
    structure: number | null;
    conciseness: number | null;
    iran_practicality: number | null;
    depth: number | null;
  };
  rawScoreResponse: string;
};

async function main() {
  const rawFile = process.argv[2];
  if (!rawFile) {
    console.error("Usage: ts-node scripts/score-evaluation.ts <raw-responses.json>");
    process.exit(1);
  }

  const rawPath = path.isAbsolute(rawFile) ? rawFile : path.join(process.cwd(), rawFile);
  const rawData = JSON.parse(fs.readFileSync(rawPath, "utf8")) as RawItem[];

  const scoringPrompt = `
تو یک عامل ارزیاب کیفی هستی.
پاسخ زیر را از ۵ معیار با نمره ۱ تا ۱۰ ارزیابی کن:

دقت
ساختار
مختصر بودن
کاربردی بودن برای ایران
عمق پاسخ

خروجی فقط JSON باشد:
{
  "accuracy": ...,
  "structure": ...,
  "conciseness": ...,
  "iran_practicality": ...,
  "depth": ...
}
`;

  const results: ScoreRecord[] = [];

  for (const item of rawData) {
    const messages: ChatMessage[] = [
      { role: "system", content: scoringPrompt },
      {
        role: "user",
        content: `سوال: ${item.question}\n\nپاسخ مدل:\n${item.answer}`,
      },
    ];

    const reply = await generateLLMReply({ messages });

    let parsedScores: ScoreRecord["scores"] = {
      accuracy: null,
      structure: null,
      conciseness: null,
      iran_practicality: null,
      depth: null,
    };

    try {
      const parsed = JSON.parse(reply);
      const normalizeScore = (value: unknown): number | null => {
        if (value === undefined || value === null) return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };
      parsedScores = {
        accuracy: normalizeScore(parsed.accuracy),
        structure: normalizeScore(parsed.structure),
        conciseness: normalizeScore(parsed.conciseness),
        iran_practicality: normalizeScore(parsed.iran_practicality),
        depth: normalizeScore(parsed.depth),
      };
    } catch (error) {
      console.error("Failed to parse score JSON", error);
    }

    results.push({
      ...item,
      scores: parsedScores,
      rawScoreResponse: reply,
    });

    console.log("✓ Scored:", item.question);
  }

  const outPath = path.join(
    process.cwd(),
    "evaluation",
    `report-${Date.now()}.json`,
  );
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log("Report written:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
