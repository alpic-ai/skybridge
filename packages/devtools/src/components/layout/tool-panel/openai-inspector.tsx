import ReactJsonView from "@microlink/react-json-view";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { ButtonGroup } from "@/components/ui/button-group.js";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field.js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { Switch } from "@/components/ui/switch.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.js";
import { LocaleSelector } from "./locale-selector.js";
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
              <LocaleSelector
                value={openaiObject.locale ?? ""}
                onValueChange={(value) => handleValueChange("locale", value)}
              />
            </Field>
            <Field>
              <FieldLabel>Device Type</FieldLabel>
              <Select
                value={openaiObject.userAgent?.device?.type ?? "desktop"}
                onValueChange={(value) =>
                  handleValueChange("userAgent", {
                    ...openaiObject.userAgent,
                    device: {
                      ...openaiObject.userAgent?.device,
                      type: value as "mobile" | "desktop",
                    },
                  })
                }
                aria-label="Select device type"
                items={[
                  { label: "Mobile", value: "mobile" },
                  { label: "Desktop", value: "desktop" },
                ]}
                name="deviceType"
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Capabilities</FieldLabel>
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="hover"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Hover
                  </label>
                  <Switch
                    id="hover"
                    checked={
                      openaiObject.userAgent?.capabilities?.hover ?? false
                    }
                    onCheckedChange={(checked) =>
                      handleValueChange("userAgent", {
                        ...openaiObject.userAgent,
                        capabilities: {
                          ...openaiObject.userAgent?.capabilities,
                          hover: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="touch"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Touch
                  </label>
                  <Switch
                    id="touch"
                    checked={
                      openaiObject.userAgent?.capabilities?.touch ?? false
                    }
                    onCheckedChange={(checked) =>
                      handleValueChange("userAgent", {
                        ...openaiObject.userAgent,
                        capabilities: {
                          ...openaiObject.userAgent?.capabilities,
                          touch: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
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
