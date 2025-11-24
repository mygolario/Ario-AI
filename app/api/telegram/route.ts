import { NextResponse } from "next/server";
import { webhookCallback } from "telegraf";
import { createTelegramBot } from "@/telegram/bot";

export const runtime = "nodejs";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
}

const bot = createTelegramBot(token);
const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(request: Request) {
  return handleUpdate(request);
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

