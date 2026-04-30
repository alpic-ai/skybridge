import { useUser } from "skybridge/web";

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
    <div className="tab-content">
      <p className="description">
        Access user information including locale and device details. Useful for
        adapting your widget to the user's environment.
      </p>

      <div style={{ display: "flex", gap: "1rem" }}>
        <div className="field">
          <span className="field-label">Locale</span>
          <code>{locale}</code>
        </div>

        <div className="field">
          <span className="field-label">Device</span>
          <code>{userAgent.device.type}</code>
        </div>

        <div className="field">
          <span className="field-label">Touch</span>
          <code>{JSON.stringify(userAgent.capabilities.touch)}</code>
        </div>

        <div className="field">
          <span className="field-label">Hover</span>
          <code>{JSON.stringify(userAgent.capabilities.hover)}</code>
        </div>
      </div>

      {flag && (
        <div className="field">
          <span className="field-label">Localized flag</span>
          <code style={{ fontSize: "2rem" }}>{flag}</code>
        </div>
      )}
    </div>
  );
}
