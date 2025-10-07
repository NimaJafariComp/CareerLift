# CareerLift

## Stack Overview

Your complete CareerLift AI-Powered Career Development Platform is now running with:

### Infrastructure
- ✅ **Docker** with **BuildKit** (latest features enabled)
- ✅ **Docker Compose** (modern v2 format, no version field)
- ✅ Multi-container orchestration with health checks

### Database
- ✅ **Neo4j** (latest) - Graph database with APOC plugins
  - HTTP: http://localhost:7474
  - Bolt: bolt://localhost:7687
  - Credentials: neo4j / password123

### AI/ML Services
- ✅ **Ollama** (latest) - Local LLM inference
  - URL: http://localhost:11434
  - Model installed: **llama3.2** (2.0 GB)

### Backend
- ✅ **Python 3.12** with **FastAPI**
- ✅ **Pydantic** - Data validation
- ✅ **LangChain** - LLM orchestration (configured for Ollama)
- ✅ **Playwright** - Web scraping with Chromium
- ✅ API: http://localhost:8000
- ✅ Swagger UI: http://localhost:8000/docs

### Frontend
- ✅ **Next.js 15** with App Router
- ✅ **React 19** (latest)
- ✅ **TypeScript** with type safety
- ✅ **Tailwind CSS 3** with latest PostCSS plugin
- ✅ **Axios** for HTTP requests
- ✅ URL: http://localhost:3000
- ✅ **Default Next.js welcome page** is displayed

### Desktop Application
- ✅ **Electron** wrapper configured
  - Development: loads from localhost:3000
  - Production: loads from static build

## Verified Working

### 1. Backend Health ✅
```bash
$ curl http://localhost:8000/health
{
  "status": "healthy",
  "services": {
    "neo4j": "connected",
    "ollama": "available",
    "playwright": "initialized"
  }
}
```

### 2. Frontend ✅
- Default Next.js 15 + React 19 page displaying correctly
- Hot reload enabled in development mode

### 3. Database ✅
- Neo4j running with APOC plugins
- Connection verified via backend

### 4. LLM ✅
- Ollama service healthy
- llama3.2 model pulled and ready

## Available API Endpoints

### Career Endpoints
- `GET /career/advice` - AI-generated career advice
- `POST /career/goals` - Create career goals
- `GET /career/goals` - Get all career goals
- `POST /career/skills` - Add skills
- `POST /career/analyze-job` - Analyze job descriptions
- `POST /career/resume-feedback` - Get resume feedback

### Scraper Endpoints
- `POST /scraper/scrape-job` - Scrape job postings
- `POST /scraper/scrape-company` - Scrape company info

## Quick Commands

### Start All Services
```bash
docker compose up -d
```

### View Logs
```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
```

### Stop All Services
```bash
docker compose down
```

### Clean Restart (removes volumes)
```bash
docker compose down -v
docker compose up -d
```

### Run Electron Desktop App
```bash
cd electron
npm install
npm run dev
```

## Environment Variables

All configuration is in `.env`:
```bash
# Docker BuildKit
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# Ollama
OLLAMA_URL=http://localhost:11434

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing the Stack

### Test Backend Health
```bash
curl http://localhost:8000/health
```

### Test Frontend
```bash
curl http://localhost:3000
```

### Test Career Advice (AI)
```bash
curl "http://localhost:8000/career/advice?current_role=Junior%20Developer&target_role=Senior%20Developer&skills=Python,Docker&experience_years=2"
```

### Pull Additional Models
```bash
docker compose exec ollama ollama pull llama2
docker compose exec ollama ollama pull mistral
```

## Project Structure

```
CareerLift/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── core/           # Config & database
│   │   ├── models/         # Pydantic models
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   └── main.py         # App entry
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # Next.js frontend
│   ├── app/               # App Router
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── electron/              # Desktop app
│   ├── main.js
│   └── package.json
├── docker-compose.yml
├── .env.example
└── .env
```

## Next Steps

1. ✅ All services verified and running
2. 🎯 Start building features:
   - Customize AI prompts in `backend/app/services/llm_service.py`
   - Add career graph nodes in Neo4j
   - Extend frontend with custom components
   - Configure authentication
3. 📱 Test Electron desktop app
4. 🚀 Deploy to production

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port
lsof -ti:3000 | xargs kill
lsof -ti:8000 | xargs kill
```

### Docker Issues
```bash
# Ensure BuildKit is enabled
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Rebuild with no cache
docker compose build --no-cache
```

### Ollama Model Issues
```bash
# List models
docker compose exec ollama ollama list

# Remove and re-pull
docker compose exec ollama ollama rm llama3.2
docker compose exec ollama ollama pull llama3.2
```

---

**Status**: ✅ All systems operational
**Stack**: Complete and verified
**Ready for**: Development and feature building
