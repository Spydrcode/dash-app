# Driver Profit MCP Server Architecture

## 🤖 **AI Agent System Overview**

This system implements a sophisticated multi-agent architecture using Model Context Protocol (MCP) servers to handle different aspects of driver profit optimization.

### 🏗️ **Architecture Components**

```
┌─────────────────────────────────────────────────────────────┐
│                    DASH-APP FRONTEND                        │
│                  (User Interface)                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                MCP ORCHESTRATOR                             │
│              (Agent Coordinator)                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
┌────▼───┐   ┌───▼───┐   ┌────▼───┐
│Data    │   │Analytics│   │Trip    │
│Extract │   │& Predict│   │Mgmt    │
│Agent   │   │Agent    │   │Agent   │
└────────┘   └───────┘   └────────┘
```

## 🎯 **Agent Responsibilities**

### 1. **Data Extraction Agent** (`/mcp-servers/data-extraction-agent/`)

- **Purpose**: OCR processing and LLM-based data extraction
- **Models**: Tesseract OCR + Llama2 13B Instruct
- **Capabilities**:
  - `extract_trip_data` - Process screenshots to extract trip details
  - `process_text_extraction` - Parse raw text into structured data
  - `validate_trip_data` - Clean and validate extracted information

### 2. **Analytics & Prediction Agent** (`/mcp-servers/analytics-agent/`)

- **Purpose**: Profit prediction and market analysis
- **Models**: ML-Regression + Llama2 for insights
- **Capabilities**:
  - `train_profit_model` - Train ML models on historical data
  - `predict_trip_profit` - Predict profitability of potential trips
  - `analyze_peak_hours` - Identify optimal working times
  - `optimize_schedule` - Generate optimal driving schedules
  - `generate_market_insights` - AI-powered market analysis

### 3. **Trip Management Agent** (Planned)

- **Purpose**: Schedule optimization and real-time recommendations
- **Capabilities**:
  - Route optimization
  - Real-time demand prediction
  - Driver performance tracking

## 🔧 **Model Configuration**

### **Current Models:**

1. **LLM Model**: `llama2:13b-instruct`

   - **Usage**: Text processing, data extraction, market insights
   - **Context**: 4096 tokens
   - **Temperature**: 0.1 (data extraction), 0.3 (insights)

2. **ML Models**:
   - **Linear Regression**: Trip profit prediction based on distance
   - **Polynomial Regression**: Multi-factor profit prediction
   - **Time Series**: Peak hour analysis

### **Recommended Additional Models:**

1. **For Classification**: `mistral:7b-instruct`

   - Platform classification
   - Trip type categorization

2. **For Embeddings**: `nomic-embed-text`
   - Location similarity
   - Route clustering

## 🚀 **Setup Instructions**

### **1. Install Dependencies**

```bash
cd mcp-servers
npm run install:all
```

### **2. Configure Environment**

Create `.env` in the root directory:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2:13b-instruct
LOG_LEVEL=info
```

### **3. Install Ollama Models**

```bash
ollama pull llama2:13b-instruct
ollama pull mistral:7b-instruct
```

### **4. Start MCP Servers**

```bash
# Start all agents
npm run start:all

# Or start individually
npm run start:data-extraction
npm run start:analytics
```

## 📊 **Data Flow**

1. **Upload Screenshot** → Data Extraction Agent
2. **Extract Trip Data** → Validate & Store
3. **Historical Analysis** → Analytics Agent
4. **Train Models** → Generate Predictions
5. **Market Insights** → Trip Management Agent
6. **Optimize Schedule** → Present to User

## 🔄 **Agent Interaction Patterns**

### **Sequential Processing:**

```
Screenshot → OCR → LLM Extraction → Validation → Storage
```

### **Parallel Analysis:**

```
Trip Data → [Peak Hour Analysis] → Recommendations
         → [Profit Prediction]  → Schedule
         → [Market Insights]    → Opportunities
```

## 🎛️ **Configuration Options**

### **Model Selection:**

- **High Accuracy**: `llama2:13b-instruct` (8GB VRAM)
- **Balanced**: `mistral:7b-instruct` (4GB VRAM)
- **Fast**: `codellama:7b-instruct` (4GB VRAM)

### **Prediction Models:**

- **Linear**: Simple distance-based profit prediction
- **Polynomial**: Multi-factor profit analysis
- **Custom**: Train on your specific data patterns

## 📈 **Performance Optimization**

### **For Training:**

1. Collect 100+ trip records for reliable models
2. Include diverse time periods and platforms
3. Validate data quality before training

### **For Inference:**

1. Cache frequently used predictions
2. Batch process multiple requests
3. Use appropriate model for task complexity

## 🔮 **Future Enhancements**

1. **Real-time Market Data Integration**
2. **Advanced Route Optimization**
3. **Demand Forecasting Models**
4. **Multi-platform Strategy Optimization**
5. **Automated Tax Optimization**

## 🛠️ **Troubleshooting**

### **Common Issues:**

- **Ollama not responding**: Check `ollama serve` is running
- **Low prediction accuracy**: Need more training data
- **OCR errors**: Improve image quality/preprocessing
- **Memory issues**: Reduce model size or batch size

---

**Note**: This is a development setup. For production, consider containerization, proper logging, error handling, and security measures.
