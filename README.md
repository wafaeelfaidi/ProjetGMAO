# Project GMAO 🔧

[![Documentation](https://readthedocs.org/projects/project-gmao/badge/?version=latest)](https://project-gmao.readthedocs.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**GMAO** (Gestion de Maintenance Assistée par Ordinateur) - A modern, AI-powered maintenance management system with predictive analytics, real-time IoT integration, and intelligent document retrieval.

## ✨ Features

- 🤖 **AI-Powered Chatbot** - RAG-based assistant with document retrieval
- 📊 **Predictive Maintenance** - ML models for failure prediction
- 📡 **IoT Integration** - Real-time sensor data streaming
- 📅 **Task Delegation** - Role-based maintenance task management
- 📈 **Interactive Dashboard** - Visualize KPIs and maintenance metrics
- 🔐 **Secure by Default** - Row-level security with Supabase

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/project-gmao.git
cd project-gmao

# Install dependencies
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
cd apps/web
npx supabase db push

# Start development server
pnpm dev
```

Visit http://localhost:3000 to see the application.

## 📚 Documentation

Full documentation is available at [project-gmao.readthedocs.io](https://project-gmao.readthedocs.io)

- [Quick Start Guide](https://project-gmao.readthedocs.io/en/latest/getting-started/quick-start/)
- [Installation](https://project-gmao.readthedocs.io/en/latest/getting-started/installation/)
- [Architecture Overview](https://project-gmao.readthedocs.io/en/latest/architecture/overview/)
- [API Documentation](https://project-gmao.readthedocs.io/en/latest/development/api/)

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui
- TanStack Query

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Python FastAPI
- pgvector for RAG
- Row Level Security

**AI/ML:**
- Scikit-learn
- Cohere Embeddings
- OpenAI/Cohere/Mistral/Gemini LLMs
- TensorFlow

## 📁 Project Structure

```
project-gmao/
├── apps/
│   ├── api/              # Python FastAPI backend
│   ├── web/              # Next.js frontend
│   └── e2e/              # End-to-end tests
├── packages/
│   ├── ui/               # Shared UI components
│   ├── supabase/         # Supabase client
│   └── shared/           # Shared utilities
├── docs/                 # Documentation
├── DATA/                 # Sample data
└── tooling/              # Build tools
```

## 🎯 Key Capabilities

### RAG Chatbot
Upload technical documentation (PDF, DOCX, TXT) and ask questions. The chatbot uses vector embeddings and similarity search to retrieve relevant context and generate accurate answers.

### Predictive Maintenance
Machine learning models trained on historical failure data predict equipment breakdowns before they occur, enabling proactive maintenance scheduling.

### Real-Time IoT
Stream sensor data from industrial equipment in real-time, store it in PostgreSQL, and visualize it on interactive dashboards.

### Task Management
Admins can delegate maintenance tasks to operators with complete tracking, status updates, and notification system.

## 🔧 Configuration

### Cohere API (Required for RAG)

1. Sign up at [cohere.com](https://cohere.com)
2. Get your API key
3. Configure in Data Management section of the app

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migrations from `apps/web/supabase/migrations/`
3. Create storage bucket (see `CREATE_STORAGE_BUCKET.md`)

## 🧪 Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start Python API
cd apps/api
source env/bin/activate
uvicorn maintenance:app --reload
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📞 Support

- 📖 [Documentation](https://project-gmao.readthedocs.io)
- 🐛 [Issue Tracker](https://github.com/yourusername/project-gmao/issues)
- 💬 [Discussions](https://github.com/yourusername/project-gmao/discussions)

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Cohere](https://cohere.com)
- [Shadcn/ui](https://ui.shadcn.com)

---

**Made with 🧡 and ⚫**
