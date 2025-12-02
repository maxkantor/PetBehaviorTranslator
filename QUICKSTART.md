# 🚀 Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- .NET 8 SDK installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Step 1: Set Up Backend

```bash
cd backend
dotnet restore
```

Set your OpenAI API key:
- **Windows PowerShell:** `$env:OPENAI_API_KEY="your-key-here"`
- **Windows CMD:** `set OPENAI_API_KEY=your-key-here`
- **Linux/Mac:** `export OPENAI_API_KEY="your-key-here"`

Run the backend:
```bash
dotnet run
```

Backend will be available at `http://localhost:5000`

## Step 2: Set Up Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Step 3: Test the App

1. Open `http://localhost:3000` in your browser
2. Type a pet behavior or click a preset button
3. Click "Translate Behavior"
4. See the AI-powered analysis!

## Troubleshooting

- **Backend won't start:** Make sure `OPENAI_API_KEY` is set
- **Frontend can't connect:** Ensure backend is running on port 5001
- **API errors:** Check your OpenAI API key is valid and has credits

For detailed deployment instructions, see [README.md](README.md)

