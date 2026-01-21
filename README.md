# AI Knowledge Search Engine

A RAG-based app for uploading documents, searching semantically, and chatting with content using local LLMs.

<p align="center">
  <img src="frontend/public/assets/screenshot(23).png" alt="App Screenshot" width="800"/>
</p>

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features
- Document upload (PDF, DOCX, TXT)
- Hybrid search (vector + BM25 + reranking)
- Local LLM integration (Ollama with llama3.2)
- User authentication and isolation
- React frontend with real-time chat
- Dockerized setup

## Tech Stack
- Backend: FastAPI, SQLAlchemy, ChromaDB, LangChain
- Frontend: React
- Database: MySQL
- LLM: Ollama
- Docker for deployment

## Quick Start
1. Clone repo: `git clone https://github.com/yourusername/repo.git`
2. Start with Docker: `docker compose up --build`
3. Access frontend: http://localhost
4. API: http://localhost:8000/docs


## Structure
.
├── backend/          # FastAPI server
│   ├── api/          # Endpoints (chat, auth, etc.)
│   ├── rag/          # RAG pipeline
│   ├── utils/        # Helpers
│   ├── db/           # Database models
│   └── main.py       # Entry point
├── frontend/         # React app
├── docker-compose.yml  # Multi-container setup
└── README.md         # This file


## Setup .env
Create .env in root:

## Contributing
See CONTRIBUTING.md

## License
MIT