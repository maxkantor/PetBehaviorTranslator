# 🐾 AI Pet Behavior Translator

A fun, colorful full-stack web application that translates pet behaviors into actionable advice using AI. Built with React (Vite) and .NET 8 Minimal API.

## ✨ Features

- 🎨 **Fun, Colorful Pet-Themed UI** - Bright colors, rounded corners, paw-print backgrounds
- 🤖 **AI-Powered Analysis** - Uses OpenAI GPT-4o-mini to analyze pet behaviors
- ⚡ **Quick Preset Buttons** - Common behavior scenarios for instant access
- 📋 **Comprehensive Results** - Cause, quick fix, step-by-step solutions, vet warnings, and product recommendations
- 🛒 **Monetization Ready** - Amazon Associates affiliate links for recommended products (see [MONETIZATION_SETUP.md](MONETIZATION_SETUP.md))
- 🐾 **Animated Loading States** - Cute paw icon animations
- 💎 **Premium Page** - Placeholder for future monetization

## 🏗️ Project Structure

```
PetBehaviorTranslator/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── pages/     # Home and Premium pages
│   │   └── ...
│   └── package.json
├── backend/           # .NET 8 Minimal API
│   ├── Program.cs     # Main API endpoint
│   └── PetBehaviorTranslator.csproj
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **.NET 8 SDK**
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (optional, defaults to `http://localhost:5000`):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `VITE_API_URL` if your backend runs on a different port.

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Set your OpenAI API key as an environment variable:
   
   **Windows (PowerShell):**
   ```powershell
   $env:OPENAI_API_KEY="your-api-key-here"
   ```
   
   **Windows (CMD):**
   ```cmd
   set OPENAI_API_KEY=your-api-key-here
   ```
   
   **Linux/Mac:**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

   Alternatively, you can add it to `appsettings.json` (not recommended for production):
   ```json
   {
     "OpenAI": {
       "ApiKey": "your-api-key-here"
     }
   }
   ```

3. Restore dependencies and run:
   ```bash
   dotnet restore
   dotnet run
   ```

   The backend will be available at `http://localhost:5000`
   Swagger UI will be available at `http://localhost:5000/swagger`

## 🧪 Testing the Application

1. Start both frontend and backend servers
2. Open `http://localhost:3000` in your browser
3. Type a pet behavior description or click a preset button
4. Click "Translate Behavior" and wait for the AI analysis

## 📦 Building for Production

### Frontend

```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`

### Backend

```bash
cd backend
dotnet publish -c Release -o ./publish
```

## ☁️ AWS Deployment

### Frontend → AWS Amplify

1. **Push your code to a Git repository** (GitHub, GitLab, Bitbucket)

2. **Connect to AWS Amplify:**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
   - Click "New app" → "Host web app"
   - Connect your repository
   - Amplify will auto-detect the build settings from `amplify.yml`

3. **Configure Environment Variables:**
   - In Amplify Console → App settings → Environment variables
   - Add: `VITE_API_URL` = `https://your-api-gateway-url.amazonaws.com/Prod`

4. **Deploy:**
   - Amplify will automatically build and deploy on every push to your main branch

### Backend → AWS Lambda + API Gateway

#### Option 1: Using AWS Lambda with Container Image

1. **Build and push Docker image:**
   ```bash
   cd backend
   docker build -t pet-behavior-translator .
   docker tag pet-behavior-translator:latest <your-ecr-repo-uri>:latest
   docker push <your-ecr-repo-uri>:latest
   ```

2. **Create Lambda Function:**
   - Go to AWS Lambda Console
   - Create function → Container image
   - Select your ECR image
   - Set handler: `PetBehaviorTranslator::PetBehaviorTranslator.LambdaEntryPoint::FunctionHandlerAsync`
   - Configure environment variable: `OPENAI_API_KEY`

3. **Create API Gateway:**
   - Create REST API
   - Create resource: `/api`
   - Create resource: `/translate` (under `/api`)
   - Create POST method
   - Integrate with Lambda function
   - Deploy API

#### Option 2: Using AWS SAM (Serverless Application Model)

1. **Install AWS SAM CLI:**
   ```bash
   # Follow instructions at https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   ```

2. **Deploy:**
   ```bash
   cd backend
   sam build
   sam deploy --guided
   ```

   During guided deployment, provide:
   - Stack name
   - AWS Region
   - OpenAI API Key (will be stored in Parameter Store)

3. **Get API URL:**
   - After deployment, SAM will output the API Gateway URL
   - Use this URL in your Amplify environment variables

### Environment Variables for Lambda

Make sure to set these in your Lambda function configuration:
- `OPENAI_API_KEY` - Your OpenAI API key (use AWS Secrets Manager or Parameter Store for production)

### CORS Configuration

The backend is already configured to allow all origins in development. For production, update CORS in `Program.cs`:

```csharp
options.AddPolicy("AllowAll", policy =>
{
    policy.WithOrigins("https://your-amplify-app.amplifyapp.com")
          .AllowAnyMethod()
          .AllowAnyHeader();
});
```

## 🔧 Configuration

### API Endpoint

The frontend connects to the backend via the `VITE_API_URL` environment variable. Defaults to `http://localhost:5000` in development.

### OpenAI Model

The backend uses `gpt-4o-mini` by default (cheapest model). To change, edit `Program.cs`:

```csharp
model: "gpt-4o-mini", // Change to "gpt-4" or other models
```

## 📝 API Documentation

### POST /api/translate

**Request:**
```json
{
  "behavior": "My dog barks at night"
}
```

**Response:**
```json
{
  "cause": "Likely due to...",
  "quickFix": "Try...",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "vetWarning": "Consult a vet if...",
  "products": ["Product 1", "Product 2"]
}
```

## 🛠️ Tech Stack

- **Frontend:**
  - React 18
  - Vite
  - React Router
  - React Icons
  - Axios
  - CSS Modules

- **Backend:**
  - .NET 8
  - Minimal API
  - OpenAI SDK
  - Swagger/OpenAPI

## 📄 License

This project is open source and available under the MIT License.

## 🐾 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 🆘 Troubleshooting

### Backend won't start
- Ensure .NET 8 SDK is installed: `dotnet --version`
- Check that `OPENAI_API_KEY` is set correctly
- Verify port 5000 is not in use

### Frontend can't connect to backend
- Check that backend is running on `http://localhost:5000`
- Verify `VITE_API_URL` in `.env` matches your backend URL
- Check browser console for CORS errors

### OpenAI API errors
- Verify your API key is valid
- Check your OpenAI account has credits
- Ensure you're using a valid model name

---

**Made with 🐾 by the Pet Behavior Translator team**



