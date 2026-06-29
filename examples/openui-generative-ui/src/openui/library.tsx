import {
  openuiPromptOptions,
  openuiLibrary as standardOpenuiLibrary,
} from "@openuidev/react-ui";

export const openuiLibrary = standardOpenuiLibrary;

export const exampleOpenuiProgram: string = `root = Stack([hero, metrics, report], "column", "l")
hero = Card([headline, subhead, themeNote], "clear")
headline = TextContent("Launch readiness", "large-heavy")
subhead = TextContent("Generated with OpenUI's standard component library inside a Skybridge MCP app.")
themeNote = Callout("info", "Skybridge theme", "The view uses OpenUI components styled through Skybridge brand tokens.")
metrics = Stack([confidenceCard, riskCard, milestoneCard], "row", "m", "stretch", "start", true)
confidenceCard = Card([confidenceLabel, confidenceValue, confidenceTrend], "card")
confidenceLabel = TextContent("Confidence", "small")
confidenceValue = TextContent("82%", "large-heavy")
confidenceTrend = TextContent("+9 points since last checkpoint")
riskCard = Card([riskLabel, riskValue, riskTrend], "card")
riskLabel = TextContent("Open risks", "small")
riskValue = TextContent("3", "large-heavy")
riskTrend = TextContent("2 need owner input")
milestoneCard = Card([milestoneLabel, milestoneValue, milestoneTrend], "card")
milestoneLabel = TextContent("Next milestone", "small")
milestoneValue = TextContent("Beta", "large-heavy")
milestoneTrend = TextContent("Target: Friday")
report = Stack([summaryCard, chartCard, planCard, tableCard], "column", "m")
summaryCard = Card([summaryHeader, summaryText, summaryCallout], "card")
summaryHeader = CardHeader("Recommendation", "Readiness summary")
summaryText = TextContent("Proceed with beta after closing payment fallback coverage and onboarding checklist gaps.")
summaryCallout = Callout("success", "Ready path", "Core flows are stable enough for a small first cohort.")
chartCard = Card([chartHeader, chart], "card")
chartHeader = CardHeader("Readiness trend", "Confidence score across the beta window")
chart = LineChart(days, [confidenceSeries], "natural", "Day", "Score")
days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
confidenceSeries = Series("Confidence", [68, 72, 76, 79, 82])
planCard = Card([planHeader, plan], "card")
planHeader = CardHeader("Execution plan", "Milestones before launch")
plan = Steps([step1, step2, step3])
step1 = StepsItem("Confirm scope", "Lock beta criteria and owner assignments today.")
step2 = StepsItem("Verify flows", "Run checkout, auth, onboarding, and recovery scenarios tomorrow.")
step3 = StepsItem("Ship beta", "Publish notes and monitor the first cohort on Friday.")
tableCard = Card([tableHeader, table], "card")
tableHeader = CardHeader("Workstream status", "Owner view")
table = Table([areaCol, statusCol, ownerCol])
areaCol = Col("Area", areas)
statusCol = Col("Status", statuses)
ownerCol = Col("Owner", owners)
areas = ["Checkout", "Onboarding", "Auth recovery"]
statuses = ["Fallback review", "Checklist gap", "Ready"]
owners = ["Priya", "Marco", "Chen"]`;

export const openuiPrompt: string = openuiLibrary.prompt({
  ...openuiPromptOptions,
  additionalRules: [
    ...(openuiPromptOptions.additionalRules ?? []),
    "You are generating OpenUI Lang for a Skybridge view.",
    "Use the standard OpenUI component library only; do not invent Page, Section, StatCard, or custom components.",
    "Always start with root = Stack(...).",
    "Prefer Card, CardHeader, TextContent, Callout, Table, chart, Tabs, and Steps components for dashboards.",
    "Keep labels compact so rendered cards fit inside ChatGPT and MCP app iframes.",
  ],
  examples: [exampleOpenuiProgram, ...(openuiPromptOptions.examples ?? [])],
});
