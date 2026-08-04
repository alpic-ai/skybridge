import { ExternalLinkIcon, SearchIcon, ClockIcon, ShieldCheckIcon } from \"lucide-react\";
import { useState } from \"react\";
import type { YouComSearchResult } from \"../../youcom-client.js\";
import { useCallTool, useToolInfo } from \"../../helpers.js\";

interface SearchResultsProps {
  query?: string;
  results?: YouComSearchResult[];
  searchOptions?: {
    count?: number;
    domains?: string[];
    freshness?: string;
    safeSearch?: boolean;
  };
  searchMeta?: {
    totalResults?: number;
    searchTime?: string;
  };
  keylessMode?: boolean;
}

export default function YouComSearchResults(props: SearchResultsProps = {}) {
  // Get initial data from tool output via Skybridge hooks
  const { output, responseMetadata } = useToolInfo();
  
  // Extract initial data from tool output or use props as fallback
  const initialQuery = output?.structuredContent?.query || props.query || \"\";
  const initialResults = output?.structuredContent?.results || props.results || [];
  const initialSearchMeta = responseMetadata?.searchMeta || props.searchMeta;
  const initialKeylessMode = responseMetadata?.keylessMode ?? props.keylessMode ?? false;
  const initialSearchOptions = output?.structuredContent?.searchOptions || props.searchOptions || {};
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false);
  const { callTool } = useCallTool(\"youcom-search\");

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const result = await callTool(\"youcom-search\", { 
        query: query.trim(),
        count: initialSearchOptions.count || 10,
        domains: initialSearchOptions.domains,
        freshness: initialSearchOptions.freshness,
        safeSearch: initialSearchOptions.safeSearch,
      });
      
      if (result.structuredContent?.results) {
        setResults(result.structuredContent.results);
      }
    } catch (error) {
      console.error(\"Search failed:\", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === \"Enter\") {
      handleSearch();
    }
  };

  return (
    <div className=\"w-full max-w-4xl mx-auto p-6 space-y-6\">
      {/* Header */}
      <div className=\"text-center space-y-2\">
        <div className=\"flex items-center justify-center gap-2 text-2xl font-bold\">
          <SearchIcon className=\"h-6 w-6 text-blue-600\" />
          You.com Web Search
        </div>
        <p className=\"text-gray-600\">
          Powered by You.com • {initialKeylessMode ? \"Keyless Mode\" : \"Authenticated\"}
        </p>
      </div>

      {/* Search Bar */}
      <div className=\"flex gap-2\">
        <input
          type=\"text\"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder=\"Search the web...\"
          className=\"flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className=\"px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2\"
        >
          {loading ? (
            <div className=\"animate-spin rounded-full h-4 w-4 border-b-2 border-white\" />
          ) : (
            <SearchIcon className=\"h-4 w-4\" />
          )}
          Search
        </button>
      </div>

      {/* Search Options Display */}
      {(initialSearchOptions.domains || initialSearchOptions.freshness || initialKeylessMode) && (
        <div className=\"flex flex-wrap gap-2 text-sm\">
          {initialKeylessMode && (
            <span className=\"px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1\">
              <ShieldCheckIcon className=\"h-3 w-3\" />
              Free Mode (100 searches/day)
            </span>
          )}
          {initialSearchOptions.domains && (
            <span className=\"px-2 py-1 bg-blue-100 text-blue-800 rounded-full\">
              Domains: {initialSearchOptions.domains.join(\", \")}
            </span>
          )}
          {initialSearchOptions.freshness && (
            <span className=\"px-2 py-1 bg-green-100 text-green-800 rounded-full flex items-center gap-1\">
              <ClockIcon className=\"h-3 w-3\" />
              {initialSearchOptions.freshness}
            </span>
          )}
        </div>
      )}

      {/* Search Meta */}
      {initialSearchMeta && (
        <div className=\"text-sm text-gray-500\">
          {initialSearchMeta.totalResults && `About ${initialSearchMeta.totalResults.toLocaleString()} results`}
          {initialSearchMeta.searchTime && ` in ${initialSearchMeta.searchTime}`}
        </div>
      )}

      {/* Results */}
      {results.length > 0 ? (
        <div className=\"space-y-4\">
          {results.map((result, index) => (
            <SearchResultCard key={index} result={result} index={index} />
          ))}
        </div>
      ) : (
        <div className=\"text-center py-12 text-gray-500\">
          <SearchIcon className=\"h-12 w-12 mx-auto mb-4 opacity-50\" />
          <p>No results found. Try a different search query.</p>
        </div>
      )}

      {/* Footer */}
      <div className=\"text-center text-xs text-gray-500 pt-6 border-t\">
        <p>
          Search powered by{\" \"}
          <a 
            href=\"https://you.com\" 
            target=\"_blank\" 
            rel=\"noopener noreferrer\"
            className=\"text-blue-600 hover:underline\"
          >
            You.com
          </a>
          {initialKeylessMode && (
            <>
              {\" • \"}
              <a 
                href=\"https://you.com/platform/api-keys\" 
                target=\"_blank\" 
                rel=\"noopener noreferrer\"
                className=\"text-blue-600 hover:underline\"
              >
                Get API key for higher quotas
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  result: YouComSearchResult;
  index: number;
}

function SearchResultCard({ result, index }: SearchResultCardProps) {
  const handleClick = () => {
    window.open(result.url, \"_blank\", \"noopener,noreferrer\");
  };

  return (
    <div 
      className=\"border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer\"
      onClick={handleClick}
    >
      <div className=\"flex items-start gap-3\">
        <div className=\"flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium\">
          {index + 1}
        </div>
        <div className=\"flex-1 min-w-0\">
          <div className=\"flex items-center gap-2 mb-1\">
            {result.favicon && (
              <img 
                src={result.favicon} 
                alt=\"\" 
                className=\"w-4 h-4\"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = \"none\";
                }}
              />
            )}
            <span className=\"text-sm text-green-700 truncate\">{result.domain}</span>
            <ExternalLinkIcon className=\"h-3 w-3 text-gray-400 flex-shrink-0\" />
          </div>
          <h3 className=\"text-lg font-medium text-blue-600 hover:underline mb-1 line-clamp-2\">
            {result.title}
          </h3>
          <p className=\"text-gray-600 text-sm line-clamp-3\">{result.snippet}</p>
          <div className=\"text-xs text-gray-500 mt-2 truncate\">{result.url}</div>
        </div>
      </div>
    </div>
  );
}