# 🚀 How to Access Your GPT-Powered Rideshare Analytics App

## 🌐 App Access Information

**✅ Development Server is Running!**

- **Local Access**: http://localhost:3000
- **Network Access**: http://169.254.155.45:3000
- **Status**: Ready and operational with GPT models

## 📱 How to Access the App

### Option 1: Local Access (Recommended)

1. **Open your web browser** (Chrome, Firefox, Safari, Edge)
2. **Navigate to**: `http://localhost:3000`
3. **You should see**: Your rideshare analytics dashboard

### Option 2: Network Access (From other devices)

- **From other devices on same network**: `http://169.254.155.45:3000`
- **Use this if**: You want to access from your phone or another computer

## 🎯 What You Can Do Now

### 1. **Upload Screenshots** 📸

- Click "Upload" or drag & drop screenshot files
- Supported types: Trip offers, final totals, dashboard summaries
- **GPT-4o will automatically extract data** from your screenshots

### 2. **View AI Insights** 🧠

- Dashboard shows real-time analytics powered by **GPT-4 Turbo**
- Performance scores, earnings analysis, and recommendations
- **Smart insights that improve with each upload**

### 3. **Monitor Token Usage** 💰

- See exactly how much OpenAI API usage costs
- Track token consumption and costs per screenshot
- **Smart caching minimizes repeat processing costs**

### 4. **Test GPT Features** 🤖

#### Test the AI Insights:

```
Method: Go to dashboard or call API directly
URL: http://localhost:3000/api/unified-mcp
Action: ai_insights
Result: See GPT-generated analytics
```

#### Test Screenshot Processing:

```
Method: Upload screenshots through the UI
Backend: GPT-4o vision processing
Cache: Results saved to avoid reprocessing
```

#### Check Token Usage:

```
URL: http://localhost:3000/api/gpt-screenshot-processor?action=get_token_usage
Result: Detailed cost and usage analytics
```

## 🔧 API Endpoints Available

| Endpoint                        | Purpose                                    | Method |
| ------------------------------- | ------------------------------------------ | ------ |
| `/api/unified-mcp`              | Main AI insights (GPT-powered)             | POST   |
| `/api/gpt-screenshot-processor` | GPT screenshot processing & token tracking | POST   |
| `/api/upload`                   | File upload for screenshots                | POST   |
| `/api/fix-data-pipeline`        | Data extraction and processing             | POST   |

## 🧪 Quick System Test

Run this in a new terminal to test all GPT features:

```bash
node test-gpt-only-system.js
```

This will test:

- ✅ GPT screenshot processing status
- ✅ Token usage tracking
- ✅ AI insights generation
- ✅ Smart caching system
- ✅ Database connectivity

## 📊 Dashboard Features

When you access `http://localhost:3000`, you'll see:

### Main Dashboard

- **Total Trips**: Accurately counted individual trips
- **Earnings & Profit**: Real financial data from screenshots
- **Performance Score**: GPT-calculated efficiency rating
- **AI Recommendations**: Smart suggestions from GPT-4 Turbo

### Analytics Sections

- **Performance Breakdown**: Earnings per mile, profit margins
- **Time Analysis**: Best days/hours (capped at realistic values)
- **Token Usage**: OpenAI API cost monitoring
- **Screenshot Status**: Processing progress and quality

## 🚀 Getting Started Steps

1. **Access the app**: `http://localhost:3000`
2. **Upload a screenshot**: Drag a trip screenshot to the upload area
3. **Watch GPT process it**: GPT-4o will extract data automatically
4. **View updated insights**: Dashboard updates with new GPT-generated analytics
5. **Monitor costs**: Check token usage to track OpenAI API spending

## 💡 Pro Tips

- **Batch upload screenshots** for efficient processing
- **Screenshots are cached** - no duplicate processing costs
- **Insights improve over time** - cumulative intelligence system
- **Monitor token usage** to manage OpenAI costs
- **All processing uses GPT models** - no local dependencies

## 🔍 Troubleshooting

**If app won't load**:

- Check if `npm run dev` is running
- Try `http://127.0.0.1:3000` instead
- Clear browser cache and reload

**If GPT features fail**:

- Verify OpenAI API key in `.env.local`
- Check database setup: `node check-database.js`
- Run system test: `node test-gpt-only-system.js`

**Need help?**:

- Check browser console for errors (F12)
- Look at terminal output for error messages
- Verify all environment variables are set

---

## 🎉 You're All Set!

Your GPT-powered rideshare analytics app is ready to use at:

## **http://localhost:3000**

Upload some screenshots and watch the AI magic happen! 🚀
