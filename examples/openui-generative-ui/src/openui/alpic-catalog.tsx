import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@alpic-ai/ui/components/alert";
import { Badge } from "@alpic-ai/ui/components/badge";
import { Button } from "@alpic-ai/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@alpic-ai/ui/components/card";
import { cn } from "@alpic-ai/ui/lib/cn";
import { defineComponent } from "@openuidev/react-lang";
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useOpenExternal } from "skybridge/web";
import { z } from "zod/v4";

const projectStatusSchema = z.enum(["live", "deploying", "error", "idle"]);
const trendDirectionSchema = z.enum(["up", "down", "flat"]);
const insightIntentSchema = z.enum(["info", "success", "warning", "danger"]);

const projectStatusCopy = {
  live: { label: "Live", variant: "success" as const },
  deploying: { label: "Deploying", variant: "warning" as const },
  error: { label: "Error", variant: "error" as const },
  idle: { label: "Idle", variant: "secondary" as const },
};

const insightAlertVariant = {
  info: "default" as const,
  success: "success" as const,
  warning: "warning" as const,
  danger: "destructive" as const,
};

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

export const StatusBadge = defineComponent({
  name: "StatusBadge",
  description:
    "Alpic status pill for MCP app environments. Use live, deploying, error, or idle.",
  props: z.object({
    status: projectStatusSchema,
  }),
  component: ({ props }) => {
    const copy = projectStatusCopy[props.status];
    return (
      <Badge size="sm" variant={copy.variant}>
        {copy.label}
      </Badge>
    );
  },
});

export const PageHeader = defineComponent({
  name: "PageHeader",
  description:
    "Alpic page intro with an optional eyebrow, title, and supporting subtitle.",
  props: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    eyebrow: z.string().optional(),
  }),
  component: ({ props }) => (
    <header className="flex flex-col gap-2">
      {props.eyebrow ? (
        <p className="type-text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {props.eyebrow}
        </p>
      ) : null}
      <h1 className="type-display-xs font-semibold text-foreground">
        {props.title}
      </h1>
      {props.subtitle ? (
        <p className="max-w-2xl type-text-sm text-muted-foreground">
          {props.subtitle}
        </p>
      ) : null}
    </header>
  ),
});

export const StatCard = defineComponent({
  name: "StatCard",
  description:
    "Alpic metric card with a label, value, and optional trend. Use for sessions, requests, errors, and other dashboard numbers.",
  props: z.object({
    label: z.string(),
    value: z.string(),
    trend: z.string().optional(),
    trendDirection: trendDirectionSchema.optional(),
  }),
  component: ({ props }) => {
    const direction = props.trendDirection ?? "flat";
    const Icon = trendIcon[direction];
    return (
      <Card className="min-w-[9rem] flex-1">
        <CardHeader className="gap-1">
          <CardDescription>{props.label}</CardDescription>
          <CardTitle className="type-display-xs">{props.value}</CardTitle>
        </CardHeader>
        {props.trend ? (
          <CardContent>
            <p
              className={cn(
                "inline-flex items-center gap-1 type-text-xs font-medium",
                direction === "up" && "text-emerald-600 dark:text-emerald-400",
                direction === "down" && "text-destructive",
                direction === "flat" && "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {props.trend}
            </p>
          </CardContent>
        ) : null}
      </Card>
    );
  },
});

export const ProjectCard = defineComponent({
  name: "ProjectCard",
  description:
    "Alpic MCP app project tile with name, environment, status, and an optional metric or description.",
  props: z.object({
    name: z.string(),
    environment: z.string(),
    status: projectStatusSchema,
    metric: z.string().optional(),
    description: z.string().optional(),
  }),
  component: ({ props }) => {
    const copy = projectStatusCopy[props.status];
    return (
      <Card hoverable className="min-w-[14rem] flex-1">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-muted text-primary">
                <Activity className="size-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <CardTitle>{props.name}</CardTitle>
                <CardDescription>{props.environment}</CardDescription>
              </div>
            </div>
            <Badge size="sm" variant={copy.variant}>
              {copy.label}
            </Badge>
          </div>
        </CardHeader>
        {props.metric || props.description ? (
          <CardContent className="flex flex-col gap-1">
            {props.metric ? (
              <p className="type-text-sm font-medium text-foreground">
                {props.metric}
              </p>
            ) : null}
            {props.description ? (
              <p className="type-text-xs text-muted-foreground">
                {props.description}
              </p>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    );
  },
});

export const InsightCallout = defineComponent({
  name: "InsightCallout",
  description:
    "Alpic insight alert for deploy health, recommendations, or warnings. Intent is info, success, warning, or danger.",
  props: z.object({
    title: z.string(),
    body: z.string(),
    intent: insightIntentSchema.optional(),
  }),
  component: ({ props }) => (
    <Alert variant={insightAlertVariant[props.intent ?? "info"]}>
      <AlertTitle>{props.title}</AlertTitle>
      <AlertDescription>{props.body}</AlertDescription>
    </Alert>
  ),
});

export const ActionButton = defineComponent({
  name: "ActionButton",
  description:
    "Alpic call-to-action button. Pass an https URL to open it outside the iframe.",
  props: z.object({
    label: z.string(),
    href: z.string().optional(),
  }),
  component: ({ props }) => {
    const openExternal = useOpenExternal();
    return (
      <Button
        type="button"
        onClick={() => {
          if (props.href) {
            openExternal(props.href);
          }
        }}
      >
        {props.label}
      </Button>
    );
  },
});

export const alpicCatalogComponents = [
  PageHeader,
  StatCard,
  ProjectCard,
  StatusBadge,
  InsightCallout,
  ActionButton,
];
