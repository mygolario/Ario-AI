# Ario AI

Ario AI is a Persian-first AI assistant designed for Iranian users. It provides helpful, culturally-aware responses in Persian (Farsi) for daily life questions, cultural information, and general assistance.

## Features

- 🤖 **AI-Powered Conversations**: Uses OpenRouter API with advanced language models
- 🇮🇷 **Persian-First**: Optimized for Persian language and Iranian culture
- 💬 **Web Chat Interface**: Clean, responsive chat UI
- 📱 **Telegram Bot**: Optional Telegram integration
- 💾 **Conversation Memory**: Maintains context across conversations
- 🔒 **Privacy-Focused**: Anonymous sessions with secure data handling

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **LLM Provider**: OpenRouter (default model: `deepseek/deepseek-r1:free`)
- **Styling**: CSS Modules

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenRouter API key ([Get one here](https://openrouter.ai/keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ario-AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in the required values:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/ario_ai?schema=public
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `OPENROUTER_API_KEY`: Your OpenRouter API key

### Optional Environment Variables

- `TELEGRAM_BOT_TOKEN`: Telegram bot token (if using Telegram integration)
- `APP_BASE_URL`: Base URL for OpenRouter referrer header (defaults to `http://localhost:3000`)

### LLM Model

The app uses OpenRouter with a default model of `deepseek/deepseek-r1:free` (free tier). You can change this by modifying `DEFAULT_MODEL` in `src/core/llm/client.ts`.

## Project Structure

```
Ario-AI/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── chat/          # Chat API endpoint
│   │   └── telegram/      # Telegram webhook
│   └── app/               # Chat UI page
├── src/
│   ├── core/
│   │   ├── conversation.ts    # Conversation handler
│   │   ├── llm/                # LLM client
│   │   └── memory/             # Context and history
│   ├── config/            # Configuration
│   └── types/             # TypeScript types
├── prisma/                # Prisma schema and migrations
└── ario-ai-finetune/      # Fine-tuning config (future use)
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run migrate` - Run database migrations

## License

[Add your license here]
