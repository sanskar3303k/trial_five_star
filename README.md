# Smart Resort 360 - AI-Powered Resort Intelligence Platform

## Problem Statement ID: 4

### Overview
Modern resorts need to balance three interconnected priorities: efficient operations, exceptional guest experiences, and sustainable revenue growth. Smart Resort 360 is an AI-powered intelligence solution that addresses these challenges.

---

## 🎯 Challenge Requirements Covered

### ✅ 1. Intelligent Staff Scheduling
**Problem**: Optimize staff allocation based on occupancy, workload, and availability

**Solution Features**:
- Real-time workload monitoring by department
- AI-driven staff redeployment recommendations
- Cross-training opportunity identification
- Shift optimization based on predicted demand
- Visual workload distribution charts

**Key Metrics**:
- Staff utilization percentage
- Workload balance score
- Redeployment recommendations
- Efficiency improvements

---

### ✅ 2. Predictive Maintenance
**Problem**: Identify equipment failures before they affect guests

**Solution Features**:
- IoT sensor data monitoring (temperature, vibration)
- ML-based failure probability prediction
- Equipment health scoring (0-100)
- Maintenance scheduling recommendations
- Cost analysis (preventive vs. reactive)

**Key Metrics**:
- Failure probability percentage
- Days until maintenance needed
- Cost savings potential
- Equipment health score

---

### ✅ 3. Inventory Optimization
**Problem**: Prevent stockouts and optimize resource management

**Solution Features**:
- Real-time stock level monitoring
- Demand forecasting based on occupancy
- Automatic reorder point calculation
- Supplier performance tracking
- Waste reduction analytics

**Key Metrics**:
- Days of stock remaining
- Stockout risk percentage
- Reorder recommendations
- Cost savings

---

### ✅ 4. Personalized Guest Experiences
**Problem**: Customize services based on guest preferences and behavior

**Solution Features**:
- Guest preference tracking
- VIP guest identification
- Personalized recommendations
- Stay history analysis
- Special occasion management

**Key Metrics**:
- Guest satisfaction scores
- Repeat booking rates
- Preference accuracy
- Personalization success rate

---

### ✅ 5. AI Concierge
**Problem**: Handle guest requests efficiently and recommend services

**Solution Features**:
- 24/7 AI-powered chatbot
- Natural language understanding
- Service recommendations
- Instant response to common queries
- Escalation to human staff when needed

**Key Metrics**:
- Query resolution rate
- Response time
- Guest satisfaction with AI
- Booking conversion rate

---

### ✅ 6. Guest Sentiment Analysis
**Problem**: Identify service issues from reviews and feedback

**Solution Features**:
- Multi-source review aggregation
- NLP-powered sentiment classification
- Trend analysis over time
- Category-based sentiment breakdown
- Actionable improvement suggestions

**Key Metrics**:
- Sentiment score (-1 to +1)
- Review volume trends
- Top positive/negative topics
- Response rate

---

### ✅ 7. Dynamic Pricing & Revenue Optimization
**Problem**: Maximize revenue through intelligent pricing

**Solution Features**:
- Real-time demand analysis
- Competitor price monitoring
- Seasonal trend adjustment
- Price elasticity modeling
- Revenue forecasting

**Key Metrics**:
- RevPAR (Revenue per Available Room)
- ADR (Average Daily Rate)
- Occupancy rate
- Revenue lift percentage

---

### ✅ 8. Guest Segmentation
**Problem**: Identify customer groups for targeted services

**Solution Features**:
- Behavioral clustering
- Demographic segmentation
- Spend pattern analysis
- Preference-based grouping
- Targeted campaign recommendations

**Key Metrics**:
- Segment distribution
- Segment revenue contribution
- Segment satisfaction scores
- Segment-specific insights

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - Interactive luxury UI components & guest experience portal
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Glassmorphism, animations, responsive design
- **Lucide React** - High-aesthetic iconography
- **Recharts** - Dynamic resort operations visualization

### Backend & AI Intelligence
- **Node.js 22+ (Native SQLite)** - Fast, robust REST API server
- **Express.js** - Session management, reverse proxy trust, CSRF protection (`X-SR360: portal`)
- **Nugen Intelligence Engine** - Intent classification, service routing, automated action dispatch
- **Google Gemini RAG Concierge** - Contextual guest service assistant grounded in resort knowledge
- **Real-Time Two-Way Sync** - AI Concierge booking requests automatically dispatch to Guest Portal & Manager Operations Hub

---

## 📁 Project Structure

```
resort-intelligence/
├── server/
│   ├── index.mjs               # Express API & static client server
│   ├── nugen.mjs               # Nugen intelligence engine & intent router
│   ├── rag.mjs                 # Google Gemini RAG resort concierge
│   ├── db.mjs                  # Native SQLite database layer
│   ├── auth.mjs                # Session-based auth & cookie management
│   └── data/
│       ├── resort_guide.md     # Resort knowledge base for RAG
│       └── portal.sqlite       # Local persistent database
├── src/
│   ├── pages/                  # Manager workspace & operational dashboards
│   ├── guest/                  # Guest portal, booking, and AI concierge UI
│   ├── types/                  # TypeScript interface definitions
│   ├── App.tsx                 # Main application shell & routing
│   └── index.css               # Global styles & luxury design tokens
├── scripts/
│   ├── test-nugen.mjs          # Autonomous test suite for Nugen routing
│   └── tunnel.mjs              # Persistent auto-reconnecting public tunnel
├── Dockerfile                  # Production-ready multi-stage container
├── render.yaml                 # 1-Click Render blueprint
├── railway.json                # Railway cloud deployment configuration
├── vercel.json                 # Vercel SPA routing & backend rewrite configuration
└── vite.config.ts              # Vite bundling & development proxy
```

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/sanskar3303k/trial_five_star.git
cd trial_five_star
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=5000
VITE_API_URL=http://localhost:5000
GEMINI_API_KEY=your_gemini_api_key_here
NUGEN_API_KEY=your_nugen_api_key_here
```

### 3. Development Mode
Run both frontend (Vite port 3000) and backend (Express port 5000) concurrently:
```bash
npm run dev
```
- **Manager Portal**: `http://localhost:3000/` (or port 5000 in production)
- **Guest Portal**: `http://localhost:3000/guest`
- **Default Guest Credentials**: Room `204`, Guest `Alex Morgan`
- **Default Manager Credentials**: `manager@resort.internal` / `Manager#360`

---

## 🌐 Cloud Deployment Options

### Option A: Render (1-Click Blueprint)
1. Push your repository to GitHub.
2. In Render, select **New > Blueprint** and connect this repository.
3. It will automatically detect `render.yaml`, build the frontend, and run the Express server on a unified port.

### Option B: Railway
1. In Railway, click **New Project > Deploy from GitHub repo**.
2. Railway will automatically detect `railway.json` and deploy the Dockerfile.

### Option C: Docker
```bash
docker build -t resort-intelligence .
docker run -p 5000:5000 -e PORT=5000 resort-intelligence
```

---

## 📝 Demo Credentials & Interconnection
- **Guest Experience**: Login as Room `204` (Alex Morgan).
- **AI Concierge**: Type *"I want to book a spa"* or *"Request late checkout"*.
- **Manager Workspace**: Switch to Manager Portal (`/`) -> **Requests** tab to view the synchronized ticket immediately in real-time.

---

## 👥 Target Users

1. **Resort Managers** - Overall operations oversight
2. **Department Heads** - Specific area management
3. **Staff Members** - Task execution
4. **Guests** - AI concierge interaction
5. **Owners/Investors** - Revenue and performance metrics

---

## 🎯 Key Differentiators

✅ **Unified Platform** - All operations in one place
✅ **AI-Powered** - Not just display, actionable intelligence
✅ **Modern UI/UX** - Clean, intuitive interface
✅ **Real-time Insights** - Live data updates
✅ **Comprehensive Coverage** - All 8 challenge requirements

---

Built with ❤️ for the Smart Resort 360 Challenge
