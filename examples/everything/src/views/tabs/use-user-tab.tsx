import { useUser } from "skybridge/web";
import { Code, Description, Field, TabBody } from "../components/ui.js";

function countryToFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function localeToFlag(locale: string): string {
  const region = new Intl.Locale(locale).maximize().region ?? "US";
  return countryToFlag(region);
}

export function UseUserTab() {
  const { locale, userAgent } = useUser();
  let flag: string | undefined;
  try {
    flag = localeToFlag(locale);
  } catch {}

  return (
    <TabBody>
      <Description>
        Access user information including locale and device details. Useful for
        adapting your widget to the user's environment.
      </Description>

      <div className="flex flex-wrap gap-4">
        <Field label="Locale">
          <Code>{locale}</Code>
        </Field>

        <Field label="Device">
          <Code>{userAgent.device.type}</Code>
        </Field>

        <Field label="Touch">
          <Code>{JSON.stringify(userAgent.capabilities.touch)}</Code>
        </Field>

        <Field label="Hover">
          <Code>{JSON.stringify(userAgent.capabilities.hover)}</Code>
        </Field>
      </div>

      {flag && (
        <Field label="Localized flag">
          <Code className="type-display-sm">{flag}</Code>
        </Field>
      )}
    </TabBody>
  );
}
