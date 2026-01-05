import { useKeyPress } from "ahooks";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { useCallTool, useSelectedTool } from "@/lib/mcp/index.js";

export const CallToolButton = ({
  validateForm,
  formData,
}: {
  validateForm?: () => Promise<boolean>;
  formData: Record<string, unknown> | null;
}) => {
  const tool = useSelectedTool();
  const { mutateAsync: callTool, isPending } = useCallTool();

  const handleClick = async () => {
    if (validateForm) {
      const isValid = await validateForm();
      if (!isValid) {
        return;
      }
    }
    if (!formData) {
      return;
    }

    await callTool({ toolName: tool.name, args: formData });
  };

  useKeyPress("Enter", handleClick);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} variant="default" disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Call Tool
      </Button>
    </div>
  );
};
