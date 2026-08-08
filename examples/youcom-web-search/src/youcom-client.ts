import { env } from \"./env.js\";

export interface YouComSearchResult {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  domain?: string;
}

export interface YouComSearchResponse {
  results: {
    web?: YouComSearchResult[];
    news?: YouComSearchResult[];
  };
  query: string;
  searchMeta?: {
    totalResults?: number;
    searchTime?: string;
  };
}

export interface YouComSearchOptions {
  query: string;
  count?: number;
  domains?: string[];
  freshness?: string;
  safeSearch?: boolean;
}

export class YouComSearchClient {
  private readonly baseUrl = \"https://api.you.com/v1/agents/search\";
  private readonly apiKey?: string;

  constructor() {
    this.apiKey = env.YDC_API_KEY;
  }

  // Public getter for checking if API key is available
  get hasApiKey(): boolean {
    return this.apiKey !== undefined && this.apiKey.trim() !== \"\";
  }

  async search(options: YouComSearchOptions): Promise<YouComSearchResponse> {
    const { query, count = 10, domains, freshness, safeSearch } = options;
    
    const searchParams = new URLSearchParams({
      query,
      count: count.toString(),
    });

    if (domains && domains.length > 0) {
      searchParams.set(\"domains\", domains.join(\",\"));
    }
    
    if (freshness) {
      searchParams.set(\"freshness\", freshness);
    }
    
    if (safeSearch !== undefined) {
      searchParams.set(\"safesearch\", safeSearch.toString());
    }

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    
    const headers: Record<string, string> = {
      \"Accept\": \"application/json\",
      \"User-Agent\": \"Skybridge-YouCom-Integration/1.0\",
    };

    // Add API key if available for authenticated requests
    if (this.hasApiKey) {
      headers[\"Authorization\"] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method: \"GET\",
        headers,
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error(\"Invalid You.com API key. Check your YDC_API_KEY environment variable.\");
        } else if (response.status === 429) {
          const message = this.hasApiKey
            ? \"You.com API rate limit exceeded. Please try again later.\"
            : \"You.com rate limit exceeded. Consider setting YDC_API_KEY for higher quotas.\";
          throw new Error(message);
        } else if (response.status >= 500) {
          throw new Error(\"You.com service is temporarily unavailable. Please try again later.\");
        } else {
          throw new Error(`Search failed: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      // Validate and format response
      return this.formatResponse(data, query);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(\"Unexpected error occurred while searching\");
    }
  }

  private formatResponse(data: any, query: string): YouComSearchResponse {
    // Handle both direct results and nested results structure
    const results = data.results || data;
    
    return {
      query,
      results: {
        web: this.formatResults(results.web || results.results || []),
        news: this.formatResults(results.news || []),
      },
      searchMeta: {
        totalResults: data.searchMeta?.totalResults || results.web?.length || 0,
        searchTime: data.searchMeta?.searchTime,
      },
    };
  }

  private formatResults(results: any[]): YouComSearchResult[] {
    if (!Array.isArray(results)) return [];
    
    return results.map((result) => ({
      title: result.title || result.name || \"Untitled\",
      url: result.url || result.link || \"\",
      snippet: result.snippet || result.description || \"\",
      favicon: result.favicon,
      domain: result.domain || this.extractDomain(result.url || result.link || \"\"),
    }));
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return \"\";
    }
  }
}