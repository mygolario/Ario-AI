import fs from "fs";
import path from "path";
import { PrismaClient, MessageRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const outputDir = path.join(process.cwd(), "exports");
  const outputPath = path.join(outputDir, "finetune_dataset.jsonl");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(outputPath, { encoding: "utf8" });

  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  let written = 0;

  for (const conv of conversations) {
    if (!conv.messages.length) continue;

    const chatMessages = conv.messages.map((m) => {
      const role = m.role === MessageRole.USER ? "user" : "assistant";
      return {
        role,
        content: m.content,
        source: m.source ?? null,
        created_at: m.createdAt.toISOString(),
      };
    });

    if (chatMessages.length < 2) continue;

    const record = {
      conversation_id: conv.id,
      user_client_id: conv.user?.clientId ?? null,
      title: conv.title ?? null,
      source_summary: conv.summary ?? null,
      messages: chatMessages,
    };

    writeStream.write(JSON.stringify(record) + "\n");
    written += 1;
  }

  writeStream.end();
  await new Promise((resolve) => writeStream.on("finish", resolve));

  await prisma.$disconnect();
  console.log(`Exported ${written} conversations to ${outputPath}`);
}

main().catch((err) => {
  console.error("Export failed", err);
  process.exit(1);
});
