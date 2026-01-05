import ReactJsonView from "@microlink/react-json-view";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { ButtonGroup } from "@/components/ui/button-group.js";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field.js";
import { Input } from "@/components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.js";
import { useSelectedTool } from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";

export const OpenAiInspector = () => {
  const tool = useSelectedTool();
  const { openaiRef, openaiObject } = useCallToolResult(tool.name);
  const { setToolData } = useStore();

  const handleValueChange = (key: string, value: unknown) => {
    const openai = openaiRef?.current?.contentWindow?.openai;
    if (openai && openaiObject) {
      (openai as Record<string, unknown>)[key] = value;
      setToolData(tool.name, {
        openaiObject: {
          ...openaiObject,
          [key]: value,
        },
      });
    }
  };

  if (!openaiObject) {
    return null;
  }

  return (
    <div className="overflow-auto max-h-full min-h-0">
      <Tabs defaultValue="widget-state" className="gap-0">
        <TabsList className="border-b border-border w-full">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="widget-state">Widget State</TabsTrigger>
        </TabsList>
        <TabsContent value="properties" className="p-4">
          <FieldSet>
            <Field>
              <FieldLabel>Display Mode</FieldLabel>
              <Select
                value={openaiObject.displayMode}
                onValueChange={(value) =>
                  handleValueChange("displayMode", value)
                }
                aria-label="Select framework"
                items={[
                  { label: "Inline", value: "inline" },
                  { label: "Fullscreen", value: "fullscreen" },
                  { label: "Pip", value: "pip" },
                  { label: "Modal", value: "modal" },
                ]}
                name="displayMode"
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="fullscreen">Fullscreen</SelectItem>
                    <SelectItem value="pip">Pip</SelectItem>
                    <SelectItem value="modal">Modal</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Theme</FieldLabel>
              <ButtonGroup>
                <Button
                  variant={
                    openaiObject.theme === "light" ? "default" : "outline"
                  }
                  onClick={() => handleValueChange("theme", "light")}
                >
                  <SunIcon />
                </Button>
                <Button
                  variant={
                    openaiObject.theme === "dark" ? "default" : "outline"
                  }
                  onClick={() => handleValueChange("theme", "dark")}
                >
                  <MoonIcon />
                </Button>
              </ButtonGroup>
            </Field>
            <Field>
              <FieldLabel>Locale</FieldLabel>
              <Input
                value={openaiObject.locale}
                onChange={(e) => handleValueChange("locale", e.target.value)}
              />
            </Field>
          </FieldSet>
        </TabsContent>
        <TabsContent value="widget-state" className="p-4">
          <ReactJsonView
            src={openaiObject.widgetState ?? {}}
            name={null}
            quotesOnKeys={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="rjv-default"
            collapsed={3}
            collapseStringsAfterLength={80}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
