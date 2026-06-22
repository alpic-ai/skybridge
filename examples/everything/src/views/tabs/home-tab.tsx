import { Button } from "@alpic-ai/ui/components/button";
import { useOpenExternal } from "skybridge/web";
import { Description, TabBody } from "../components/ui.js";

export function HomeTab() {
  const openExternal = useOpenExternal();

  return (
    <TabBody>
      <Description>
        Welcome to Skybridge Everything. This widget showcases all the hooks and
        features available when building ChatGPT/MCP Apps with Skybridge.
      </Description>
      <Description>
        Use the tabs above to explore each API and see how your widget can
        interact with the host application.
      </Description>
      <p className="type-text-sm text-muted-foreground">
        Read the full code implementation on{" "}
        <Button
          variant="link"
          className="h-auto p-0 align-baseline"
          onClick={() =>
            openExternal(
              "https://github.com/alpic-ai/skybridge/tree/main/examples/everything",
            )
          }
        >
          GitHub
        </Button>
      </p>
    </TabBody>
  );
}
