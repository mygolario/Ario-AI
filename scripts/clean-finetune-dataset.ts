import fs from "fs";
import path from "path";

type RawConversation = {
  conversation_id?: string;
  user_client_id?: string | null;
  title?: string | null;
  source_summary?: string | null;
  messages: { role: string; content: string }[];
};

type RawEvalItem = {
  category: string;
  question: string;
  answer: string;
};

const EMOJI_REGEX = /[\u{1F600}-\u{1F6FF}]/u;

function normalizeText(str: string): string {
  let result = str || "";
  result = result.replace(/ي/g, "ی").replace(/ك/g, "ک");
  result = result.replace(/\s+/g, " ").trim();
  result = result.replace(EMOJI_REGEX, "");
  return result;
}

function removeInvalidMessages(
  messages: { role: string; content: string }[],
): { role: string; content: string }[] {
  const greetings = ["سلام", "سلام!", "سلام.", "سلام و وقت بخیر", "سلام وقت بخیر"];
  return messages.filter((m) => {
    if (!m.content) return false;
    const norm = normalizeText(m.content);
    if (norm.length < 3 || norm.length > 4000) return false;
    if (greetings.includes(norm)) return false;
    return true;
  });
}

function filterConversation(conv: RawConversation): RawConversation | null {
  const cleanedMessages = removeInvalidMessages(conv.messages || []).map((m) => ({
    role: m.role === "USER" ? "user" : m.role === "ASSISTANT" ? "assistant" : m.role,
    content: normalizeText(m.content),
  }));

  if (cleanedMessages.length < 2) return null;

  return {
    conversation_id: conv.conversation_id,
    user_client_id: conv.user_client_id,
    title: conv.title,
    source_summary: conv.source_summary,
    messages: cleanedMessages,
  };
}

function isJSONL(pathStr: string) {
  return pathStr.endsWith(".jsonl");
}

async function loadDataset(inputPath: string): Promise<RawConversation[]> {
  const absPath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Input file not found: ${absPath}`);
  }

  if (isJSONL(absPath)) {
    const lines = fs.readFileSync(absPath, "utf8").split("\n").filter(Boolean);
    return lines.map((line) => JSON.parse(line) as RawConversation);
  }

  // Assume JSON array (e.g., raw evaluation responses)
  const raw = JSON.parse(fs.readFileSync(absPath, "utf8"));
  if (Array.isArray(raw) && raw.length && "answer" in raw[0]) {
    // Evaluation format
    const evalItems = raw as RawEvalItem[];
    return evalItems.map((item, idx) => ({
      conversation_id: `eval-${idx}`,
      user_client_id: "evaluation-bot",
      title: null,
      source_summary: null,
      messages: [
        { role: "user", content: item.question },
        { role: "assistant", content: item.answer },
      ],
    }));
  }

  // Assume array of conversations
  return raw as RawConversation[];
}

async function main() {
  const inputPath =
    process.argv[2] ??
    path.join(process.cwd(), "exports", "finetune_dataset.jsonl");

  const conversations = await loadDataset(inputPath);

  const cleaned: RawConversation[] = [];
  for (const conv of conversations) {
    const filtered = filterConversation(conv);
    if (filtered) {
      cleaned.push(filtered);
    }
  }

  const outputDir = path.join(process.cwd(), "exports");
  const outputPath = path.join(outputDir, "fine_tune_ready_dataset.jsonl");
  fs.mkdirSync(outputDir, { recursive: true });

  const lines = cleaned.map((c) => JSON.stringify({ messages: c.messages }));
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");

  console.log(
    `Cleaned dataset written: ${outputPath} (${cleaned.length} conversations)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
