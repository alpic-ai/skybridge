# You.com Web Search MCP Tool

This example demonstrates how to integrate You.com's web search capabilities into a Skybridge MCP app, providing real-time web search functionality with rich interactive results.

## Features

- **Web search**: Search the web using You.com's powerful search engine
- **Keyless operation**: Works without API key (100 free searches per day)
- **Enhanced features**: Higher quotas and additional features with optional API key
- **Rich UI**: Interactive search results with titles, snippets, and source information
- **Search options**: Support for domain filtering, freshness filtering, and safe search
- **Real-time search**: Interactive search interface within the MCP app
- **Error handling**: Graceful handling of rate limits, API errors, and network issues

## Setup

### Quick Start (Keyless Mode)

No setup required! The tool works immediately with 100 free searches per day:

```bash
npm install
npm run dev
```

### Enhanced Mode (With API Key)

For higher quotas and enhanced features:

1. Get your API key at [you.com/platform/api-keys](https://you.com/platform/api-keys)
2. Create `.env` file:
   ```
   YDC_API_KEY=your-api-key-here
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### MCP Tool

The example registers a `youcom-search` tool with the following parameters:

- `query` (required): Search query string
- `count` (optional): Number of results (1-20, default: 10)  
- `domains` (optional): Array of domains to restrict search to
- `freshness` (optional): Filter by content age ("hour", "day", "week", "month", "year")
- `safeSearch` (optional): Enable safe search filtering (default: true)

### Example Tool Calls

```typescript
// Basic search
await callTool("youcom-search", {
  query: "TypeScript MCP frameworks"
});

// Advanced search with filters
await callTool("youcom-search", {
  query: "React hooks patterns",
  count: 15,
  domains: ["reactjs.org", "github.com"],
  freshness: "month",
  safeSearch: true
});
```

### Interactive UI

The app provides a rich search interface with:

- Real-time search input
- Visual result cards with titles, snippets, and favicons
- Source domain display and external link indicators
- Loading states and error handling
- Search options display (keyless mode, domain filters, etc.)
- Responsive design that works across devices

## API Integration

The integration uses You.com's Search API:

- **Endpoint**: `https://api.you.com/v1/agents/search`
- **Authentication**: Optional Bearer token (`YDC_API_KEY`)
- **Rate limits**: 
  - Keyless: 100 searches/day per IP
  - With API key: Higher quotas based on plan
- **Response format**: Structured JSON with web and news results

### Error Handling

The tool gracefully handles:

- **401 Unauthorized**: Invalid API key guidance
- **429 Rate Limited**: Clear messaging about quota limits with upgrade suggestions
- **5xx Server Errors**: Service availability notifications
- **Network errors**: Connection issue messaging
- **Malformed responses**: Data validation and fallbacks

## Implementation Details

### Architecture

```
src/
├── youcom-client.ts     # You.com API client with error handling
├── server.ts            # MCP server with tool registration  
├── helpers.ts           # Type-safe tool calling helpers
├── env.ts              # Environment configuration
└── views/
    └── youcom-search-results/
        └── index.tsx    # React search results UI
```

### Key Components

1. **YouComSearchClient**: Handles API communication, authentication, and error handling
2. **MCP Tool Registration**: Defines the tool schema and implementation
3. **React UI Component**: Interactive search interface with real-time updates
4. **Type Safety**: Full TypeScript support with proper type inference

### Integration Patterns

The example follows Skybridge's established patterns:

- Uses `McpServer.registerTool()` for tool definition
- Implements structured content for model consumption
- Provides rich UI views for human interaction
- Includes proper error handling and user feedback
- Supports both keyless and authenticated operation modes

## Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Development with tunnel (for ChatGPT/Claude testing)
npm run dev:tunnel

# Build for production
npm run build

# Start production server
npm start
```

## Integration with AI Assistants

This MCP tool works seamlessly with:

- **Claude Code**: Install via plugin marketplace
- **ChatGPT**: Deploy as MCP app
- **VSCode Extensions**: Via MCP protocol
- **Any MCP Client**: Standard MCP tool interface

Ask your AI assistant to search for information:

> "Use the youcom-search tool to find recent TypeScript best practices"

> "Search for React 19 new features from the last month"

> "Find documentation about MCP servers on GitHub"

## License

MIT - see the main Skybridge repository for details.
