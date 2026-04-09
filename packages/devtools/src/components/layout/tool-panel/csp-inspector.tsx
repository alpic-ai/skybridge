import { ClipboardCopyIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button.js";
import { useSelectedTool, useSuspenseResource } from "@/lib/mcp/index.js";
import { type CspObservedDomains, useCallToolResult } from "@/lib/store.js";

type CspConfig = {
  resourceDomains: string[];
  connectDomains: string[];
  frameDomains: string[];
};

const CSP_CATEGORY_MAP: Record<keyof CspObservedDomains, keyof CspConfig> = {
  resourceDomains: "resourceDomains",
  connectDomains: "connectDomains",
  frameDomains: "frameDomains",
};

function extractConfiguredCsp(
  resourceMeta: Record<string, unknown> | undefined,
): CspConfig {
  if (!resourceMeta) {
    return { resourceDomains: [], connectDomains: [], frameDomains: [] };
  }

  const widgetCSP = resourceMeta["openai/widgetCSP"] as
    | Record<string, string[]>
    | undefined;
  if (widgetCSP) {
    return {
      resourceDomains: widgetCSP.resource_domains ?? [],
      connectDomains: widgetCSP.connect_domains ?? [],
      frameDomains: widgetCSP.frame_domains ?? [],
    };
  }

  const ui = resourceMeta.ui as { csp?: Record<string, string[]> } | undefined;
  if (ui?.csp) {
    return {
      resourceDomains: ui.csp.resourceDomains ?? [],
      connectDomains: ui.csp.connectDomains ?? [],
      frameDomains: ui.csp.frameDomains ?? [],
    };
  }

  return { resourceDomains: [], connectDomains: [], frameDomains: [] };
}

function originMatchesDomain(origin: string, domain: string): boolean {
  try {
    const originHost = new URL(origin).hostname;
    const domainHost = new URL(domain).hostname;
    return originHost === domainHost;
  } catch {
    return origin === domain;
  }
}

function isDomainConfigured(origin: string, configuredDomains: string[]) {
  return configuredDomains.some((d) => originMatchesDomain(origin, d));
}

type CategoryAnalysis = {
  label: string;
  configKey: string;
  configured: string[];
  observed: string[];
  missing: string[];
};

function useAnalysis(
  configuredCsp: CspConfig,
  observedDomains: CspObservedDomains,
): CategoryAnalysis[] {
  return useMemo(() => {
    const categories: {
      key: keyof CspConfig;
      label: string;
      configKey: string;
    }[] = [
      {
        key: "connectDomains",
        label: "Connect (fetch / XHR)",
        configKey: "connectDomains",
      },
      {
        key: "resourceDomains",
        label: "Resources (images, scripts, styles, fonts)",
        configKey: "resourceDomains",
      },
      {
        key: "frameDomains",
        label: "Frames (iframe embeds)",
        configKey: "frameDomains",
      },
    ];

    return categories.map(({ key, label, configKey }) => {
      const configured = configuredCsp[key];
      const observedKey = CSP_CATEGORY_MAP[key];
      const observed = observedDomains[observedKey];
      const missing = observed.filter(
        (o) => !isDomainConfigured(o, configured),
      );
      return { label, configKey, configured, observed, missing };
    });
  }, [configuredCsp, observedDomains]);
}

function buildSuggestedConfig(analysis: CategoryAnalysis[]): string | null {
  const csp: Record<string, string[]> = {};
  let hasMissing = false;

  for (const { configKey, missing } of analysis) {
    if (missing.length > 0) {
      csp[configKey] = missing;
      hasMissing = true;
    }
  }

  if (!hasMissing) {
    return null;
  }

  return JSON.stringify({ _meta: { ui: { csp } } }, null, 2);
}

function DomainBadge({
  domain,
  variant,
}: {
  domain: string;
  variant: "configured" | "missing";
}) {
  const isMissing = variant === "missing";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-mono leading-tight ${
        isMissing
          ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-700"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      }`}
    >
      {domain}
    </span>
  );
}

function CategorySection({ analysis }: { analysis: CategoryAnalysis }) {
  const { label, configured, observed, missing } = analysis;
  const hasActivity = observed.length > 0 || configured.length > 0;

  if (!hasActivity) {
    return null;
  }

  const configuredOnly = configured.filter(
    (d) => !observed.some((o) => originMatchesDomain(o, d)),
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-foreground">{label}</h4>
        {missing.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
            {missing.length} missing
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {missing.map((domain) => (
          <DomainBadge
            key={`missing-${domain}`}
            domain={domain}
            variant="missing"
          />
        ))}
        {observed
          .filter((o) => !missing.includes(o))
          .map((domain) => (
            <DomainBadge
              key={`observed-${domain}`}
              domain={domain}
              variant="configured"
            />
          ))}
        {configuredOnly.map((domain) => (
          <DomainBadge
            key={`configured-${domain}`}
            domain={domain}
            variant="configured"
          />
        ))}
      </div>
    </div>
  );
}

export function CspInspector() {
  const tool = useSelectedTool();
  const toolResult = useCallToolResult(tool.name);
  const resourceUri = tool._meta?.["openai/outputTemplate"] as
    | string
    | undefined;
  const { data: resource } = useSuspenseResource(resourceUri);

  const resourceMeta = resource?.contents?.[0]?._meta as
    | Record<string, unknown>
    | undefined;
  const configuredCsp = useMemo(
    () => extractConfiguredCsp(resourceMeta),
    [resourceMeta],
  );
  const observedDomains = toolResult?.cspObservedDomains ?? {
    resourceDomains: [],
    connectDomains: [],
    frameDomains: [],
  };

  const analysis = useAnalysis(configuredCsp, observedDomains);
  const suggestedConfig = useMemo(
    () => buildSuggestedConfig(analysis),
    [analysis],
  );
  const totalMissing = analysis.reduce((sum, a) => sum + a.missing.length, 0);
  const totalObserved = analysis.reduce((sum, a) => sum + a.observed.length, 0);

  const handleCopy = () => {
    if (suggestedConfig) {
      navigator.clipboard.writeText(suggestedConfig);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-foreground">CSP Inspector</h3>
        {totalMissing > 0 ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
            {totalMissing} domain{totalMissing > 1 ? "s" : ""} missing
          </span>
        ) : totalObserved > 0 ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            All domains configured
          </span>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Compares observed network requests against{" "}
        <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
          _meta.ui.csp
        </code>{" "}
        in your widget&apos;s resource config. Missing domains are highlighted
        in red.
      </p>

      {totalObserved === 0 && (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
          No external requests detected yet. Interact with the widget to trigger
          network activity.
        </div>
      )}

      <div className="space-y-3">
        {analysis.map((a) => (
          <CategorySection key={a.configKey} analysis={a} />
        ))}
      </div>

      {suggestedConfig && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground">
              Suggested addition to registerWidget
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={handleCopy}
            >
              <ClipboardCopyIcon className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
          <pre className="rounded-md bg-muted p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap text-foreground">
            {suggestedConfig}
          </pre>
        </div>
      )}
    </div>
  );
}
