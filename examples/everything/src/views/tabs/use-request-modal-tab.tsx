import { Button } from "@alpic-ai/ui/components/button";
import { useRequestModal } from "skybridge/web";
import { Description, TabBody } from "../components/ui.js";

export function UseRequestModalTab() {
  const { open } = useRequestModal();

  return (
    <TabBody>
      <Description>Request to open the widget in a modal dialog.</Description>

      <div>
        <Button onClick={() => open({ params: { message: "🤠 Howdy ! " } })}>
          Open modal
        </Button>
      </div>
    </TabBody>
  );
}
