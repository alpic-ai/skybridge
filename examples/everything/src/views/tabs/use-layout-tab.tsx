import { useLayout } from "skybridge/web";
import { Code, Description, Field, TabBody } from "../components/ui.js";

export function UseLayoutTab() {
  const { theme } = useLayout();

  return (
    <TabBody>
      <Description>
        Access layout and visual environment info. Values update dynamically on
        resize or theme toggle.
      </Description>

      <Field label="Theme">
        <Code>
          Runtime theme is set to {theme} {theme === "light" ? "☀️" : "🌙"}
        </Code>
      </Field>
    </TabBody>
  );
}
