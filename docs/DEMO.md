# Demo script: project review

A 7 to 10 minute live demo of RetailIQ, with talking points and backup plans.

## Before the presentation

1. **The day before**, start the app once with internet access (`start.bat`). This downloads the embedding models and builds the database, so on the day it starts in seconds.
2. **30 minutes before**, start it again and open one promotion to warm everything up. Leave the window open.
3. Check the launcher's `agent:` line:
   - `llm:<model>` means the conversational agent is on.
   - `tools-only` means there's no key. The demo still works, but answers come straight from the KPI tools.
4. **About free LLM quotas**: Gemini's free tier is small and per model (`gemini-3.5-flash` allows about 5 requests a minute and 20 a day; a briefing uses 2 to 6). Don't rehearse heavily on the day of the review with the same key. When a limit is hit, the app switches to the fallback model and then to tools-only answers, so nothing breaks. For the most reliable demo, get a free Cerebras or Groq key (see the README).
5. Open http://127.0.0.1:8000/docs in a second tab to show the API.

## The story (one sentence)

"Retailers spend a lot on discounts but rarely know which promotions actually worked. RetailIQ analyses any promotion in seconds with an AI agent that is only allowed to state numbers its KPI tools computed."

## Live walkthrough

| Step | Do this | Say this |
|---|---|---|
| 1 | Sign in as **admin / admin123** | JWT authentication; passwords are hashed with Argon2. |
| 2 | Click **Refresh Data** | The ETL pipeline pulls products, SKUs, customers, promotions, stock deliveries and 60,000 sales lines from the client's source system and reloads the database. |
| 3 | **Analyse Existing Promotion**, go to page 2, open **Black Friday Beauty Blast**, click **Analyze** | The agent decides which tools to call: promotion lookup, five KPI tools, and two RAG searches. Point at "Tools Used" at the end of the briefing. |
| 4 | Read the highlights | Units almost doubled (+99%) but revenue was flat (+0.3%). Discount efficiency is 0.00x: $1,892 of discount bought $6 of extra revenue. All 5 SKUs sold out by day 2-3, losing about 100 units. Afterwards sales fell to 0.44x of normal: pull-forward. |
| 5 | Point at **Key Drivers** | The agent found in the promotion brief (RAG) that supply chain had warned of a delivery delay before launch. That's context the numbers alone can't give. |
| 6 | Click the quick question **Which SKUs underperformed and why?**, then send | A follow-up in the same conversation, with history kept. |
| 7 | (optional) Ask "What discount level would maximise ROI?" | Across all 38 promotions, 10-20% discounts return the most revenue per dollar of discount; deep discounts lose money. |
| 8 | Back to the dashboard, then **Past Conversations** | Conversations and messages are saved in the database and can be resumed. |
| 9 | Show http://127.0.0.1:8000/docs | REST API plus a WebSocket for the chat. |

## Promotions worth showing

| Promotion | Page | What it shows |
|---|---|---|
| Black Friday Beauty Blast | 2 | Stockout on all 5 SKUs, pull-forward dip (0.44x), 0.00x efficiency |
| Winter Hydration Edit | 2 | Clean win: units +143%, revenue +108%, efficiency 2.94x |
| Concealer Clearance | 2 | Dud: units -40%, revenue -68%, 45% discount |
| Gen-Z Glow Drop | 1 | Young audience: 51% of buyers under 25 vs 22% of customers |
| Summer Skin Saver | 1 | Good uplift (+109%) but pull-forward (0.43x afterwards) |
| SPF Season Kickoff | 1 | Both SKUs sold out; supply capped a strong-demand promotion |
| BOGO Mascara Madness | 2 | Volume up (+74%), revenue down (-12%): BOGO gave away too much |

## Likely questions

**How do you stop the AI from making up numbers?**
The system prompt forbids stating any figure that didn't come from a tool. All maths happens in deterministic Python KPI calculators; the LLM only chooses tools and explains the results. The SQL tool is read-only and enforced by the database.

**Why LangGraph?**
The agent is a loop: the model asks for tools, the tool node runs them (several in parallel), and the results go back to the model until it can answer. LangGraph makes that loop explicit, and lets us use different models without changing the tools.

**Why hybrid search (dense + BM25)?**
Dense embeddings match meaning ("customers bought ahead"), BM25 matches exact terms (promotion names, "BOGO", SKU names). Reciprocal rank fusion combines both rankings.

**What is the baseline?**
An equal-length window immediately before the promotion, on the same SKUs. The post-promotion window is the equal-length window right after.

**What if the LLM API is down?**
The app retries on a fallback model, then answers from the KPI and search tools directly and labels the answer as such. The demo never shows an error screen.

**Is this real client data?**
No. The client's source system wasn't part of the project repositories, so a seeded generator recreates a realistic year of cosmetics-retail data with simulated inventory. The pipeline, KPIs and agent run against it exactly as they would against the real API.

**How would this be deployed?**
`docker compose up` runs it on PostgreSQL and a Qdrant server. The same code runs on SQLite and embedded Qdrant for a laptop demo.

## If something goes wrong

| Problem | Fix |
|---|---|
| "Port 8000 is already in use" | An older RetailIQ window is still open. Close it, or restart the laptop. |
| The answer ends with "Note: the AI model could not be reached" | Rate limit or no internet. The answer is still correct; wait a minute for the LLM, or carry on in tools-only mode. |
| Briefing takes more than 30 seconds | The LLM provider is slow. Keep talking through the architecture while it loads. |
| Browser shows the login page again | The session expired (8 hours) or the tab was closed. Sign in again. |
