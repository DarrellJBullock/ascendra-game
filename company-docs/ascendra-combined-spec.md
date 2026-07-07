# Ascendra — Combined Product & Design Spec (raw input for Product Manager / Architect)

> This is a full spec, not a build-ready task. Route through Product Manager for phasing and Architect for system design before any Frontend/Backend/DBAdmin work starts. See the phasing note at the end before using this.

## Concept
An AI-powered startup simulation game where players build, grow, fund, and manage a technology company from idea stage through to acquisition, IPO, unicorn status, or bankruptcy. Blends startup management, business strategy, SaaS operations, VC fundraising, team leadership, and AI-driven storytelling.

## Tech stack
**Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand, Recharts, Framer Motion
**Backend:** FastAPI, PostgreSQL, SQLAlchemy, Alembic, Redis, JWT auth
**AI:** OpenAI integration for dynamic events, investor interactions, employee conversations, customer feedback, board meetings, news generation

## Application structure

### 1. Authentication
Registration, login, forgot password, guest mode, user profile, saved games, subscription support.

### 2. Dashboard (primary game screen)
Displays: company name, industry, founder type, cash on hand, MRR, ARR, burn rate, runway, customer count, team size, valuation, investor confidence, team morale, product quality, technical debt. Includes revenue, customer growth, valuation, and burn rate charts.

### 3. Company creation
Industry choice: AI, Healthcare, Fintech, Cybersecurity, Ecommerce, Gaming, Education, Developer Tools.
Founder background (each with bonuses/weaknesses): Engineer, Product Manager, Sales Leader, Marketing Expert, Finance Executive.
Example — Engineer: faster feature development, lower technical debt, slower customer acquisition. Sales: faster customer growth, better fundraising, higher engineering costs.

### 4. Weekly turn engine
Each week: updated metrics, events, opportunities, risks. Processes revenue, expenses, hiring costs, churn, customer growth, infrastructure costs, investor sentiment, product improvements, technical debt accumulation.

### 5. Product management
Build features, fix bugs, refactor, improve performance/reliability, launch releases. Tracks product quality, stability, technical debt, customer satisfaction, innovation score.

### 6. Team management
Generated employee profiles with attributes (engineering, leadership, communication, creativity, reliability) and roles (Software Engineer through Staff Engineer, PM, Designer, Sales Rep, Customer Success, Marketing, Ops). Tracks salary, productivity, happiness, burnout, retention risk. Supports hiring, promotions, reviews, terminations.

### 7. Fundraising
Rounds: Bootstrap, Friends & Family, Angel, Seed, Series A, Series B. Generated investors with risk tolerance, industry expertise, growth expectations, board influence. Shows ownership dilution, valuation changes, investor expectations.

### 8. Customer management
Segments: Small Business, Mid-Market, Enterprise, Government. Tracks contracts, churn, expansion revenue, satisfaction, support tickets.

### 9. Marketing
Campaign types: SEO, content, paid ads, social, sponsorships, partnerships. Tracks leads, conversion rate, CAC, LTV, brand awareness.

### 10. Sales pipeline
Stages: Lead → Qualified → Demo → Proposal → Negotiation → Closed Won/Lost. Pipeline analytics and forecasts.

### 11. Financial center
Tracks cash, revenue, expenses, gross margin, net income, runway, valuation. Provides income statement, cash flow statement, balance sheet.

### 12. Competitor intelligence
AI-generated competitors tracked on market share, product quality, pricing, funding, customer growth. Supports competitive analysis, acquisitions, strategic responses.

### 13. AI event engine (core of the game)
Weekly generated situations across categories: Engineering (outages, security breaches, tech debt crises), Customer (enterprise opportunities, churn risk, feature requests), People (resignations, conflict, burnout), Investor (emergency board meetings, funding opportunities, down-round pressure), Market (new competitors, downturns, regulatory changes). Each event: narrative, multiple choices, simulated consequences.

### 14. AI founder advisor
Persistent advisor: strategic advice, financial analysis, product guidance, hiring recommendations, fundraising coaching.

### 15. AI board meetings
Quarterly. Board members ask about growth, revenue, hiring, roadmap, burn rate. Player responses affect investor confidence.

### 16. News system
Generated ecosystem news: competitor funding announcements, industry changes, regulations, market shifts.

### 17. Endgame paths
Unicorn ($1B valuation), IPO, acquisition, profitable lifestyle business, bankruptcy.

## UI structure
**Left sidebar:** Dashboard, Product, Team, Customers, Marketing, Sales, Investors, Finance, Competitors, Events, Advisor
**Top nav:** Current week, cash, revenue, notifications
**Main content:** Dynamic widgets, analytics, decisions, events
**Right sidebar:** AI Advisor, notifications, pending decisions

## Architecture requirements (modular)
Simulation Engine, Financial Engine, Employee Engine, Customer Engine, Fundraising Engine, Competitor Engine, Event Engine, AI Integration Layer. Production-ready, scalable, fully typed, enterprise engineering practices.

---

## World-class design requirements

**Design inspiration:** Linear, Stripe, Vercel, Ramp, Arc Browser, Notion, Figma, Carta, Crunchbase, modern startup investor dashboards.

**Overall feel:** Modern, dynamic, premium, intelligent, futuristic, highly interactive, data-driven, visually engaging, executive-level polish. Should feel alive and constantly evolving.

**Visual requirements:** Glassmorphism where appropriate, layered card interfaces, soft shadows, smooth gradients, dynamic lighting effects, animated data visualizations, micro-interactions, fluid page transitions, responsive layouts, modern typography hierarchy.

**Animations:** Animated metric counters, animated revenue/valuation charts, funding-announcement visual effects, events sliding into view, intelligent notifications, natural card expand/collapse.

**Dashboard experience:** Should communicate growth, momentum, risk, opportunity. Every major metric needs trend indicators, historical performance, forecasts, visual context.

**Data visualization:** Interactive charts, animated graphs, heatmaps, forecast projections, competitive positioning maps — for revenue, customer growth, burn rate, runway, team productivity, product quality, market share, investor confidence.

**Event presentation:** Cinematic, not simple popups — large event cards, rich illustrations, dynamic backgrounds, AI-generated contextual imagery, decision panels, animated consequences. E.g., funding rounds show investor profiles and valuation/ownership impact visually; outages show system health and customer impact; board meetings present members as distinct personalities with visual profiles.

**AI Advisor experience:** Persistent chat panel, context-aware, personalized, interactive, strategic insights tied to current company state — should feel like a strategic co-founder.

**Competitive intelligence:** Interactive market map showing funding, growth, product quality, market share, threat level.

**Theme support:** Premium dark mode (primary) and premium light mode.

**Differentiation goal:** Should feel like a venture capital operating system / startup command center, not a traditional business sim. Target reaction: "This feels like I am running the next billion-dollar company."

---

## Phasing note (read before using this as a build prompt)

This spec describes a full, mature product — realistically months of work for a real team, not a single build task. Handing this directly to Frontend/Backend agents as one prompt will produce shallow, unfinished coverage across everything rather than a working core loop. Recommended path:

1. Use this document as the **input to Product Manager**, not as a build command itself — have Product Manager cut this down to a genuine v1 (a realistic first slice might be: company creation, the weekly turn engine, the dashboard, one category of AI events, and basic fundraising — deferring competitor intelligence, board meetings, full marketing/sales pipeline depth, and the full design-polish pass to later phases).
2. Have Architect design the system before any Frontend/Backend work starts — this spec has real backend complexity (Postgres schema for employees/customers/investors/events, Redis for turn state, an AI integration layer) that needs deliberate design, not improvisation.
3. Treat the "world-class design requirements" section as a v2+ polish pass once the core game loop works functionally — building full glassmorphism/animation polish before the simulation itself is fun or working is a common way these projects stall.
