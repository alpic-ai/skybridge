import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@alpic-ai/ui/components/card";
import { BookOpen, CircleStar } from "lucide-react";
import { useOpenExternal } from "skybridge/web";

const LINKS = [
  {
    icon: CircleStar,
    title: "See the examples",
    description:
      "Templates for OAuth, e-commerce, dashboards, games, and many more.",
    href: "https://docs.skybridge.tech/showcase#examples",
  },
  {
    icon: BookOpen,
    title: "Read the docs",
    description: "Learn more about Skybridge concepts, API, and tooling.",
    href: "https://docs.skybridge.tech",
  },
];

export default function Outro() {
  // useOpenExternal: open a URL in a new browser tab from inside the iframe.
  const openExternal = useOpenExternal();

  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="type-display-xs font-mozilla font-semibold text-primary">
          That's a wrap!
        </h1>
        <p>
          You've just mastered how{" "}
          <strong>
            the data flows between the tools, the view, and the model
          </strong>
          . You can start{" "}
          <span className="bg-gradient-to-r from-primary via-cyan-500 to-primary bg-[length:200%_100%] bg-clip-text text-transparent font-semibold animate-gradient-flow">
            vibing
          </span>{" "}
          now from this very template or:
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-auto">
        {LINKS.map(({ icon: Icon, title, description, href }) => (
          <Card
            key={title}
            hoverable
            className="cursor-pointer bg-white/50 dark:bg-zinc-900/50"
            onClick={() => openExternal(href)}
          >
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Icon className="size-5 shrink-0 text-primary" />
                <CardTitle>{title}</CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
