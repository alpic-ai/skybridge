import { useUser } from "skybridge/web";
import { Code, CodeBlock } from "@/views/components/ui.js";
import { errMessage, useAutoReport } from "../context.js";
import type { HookDef, MemberResult } from "../types.js";

function Locale() {
  const { locale } = useUser();
  let result: MemberResult;
  try {
    const normalized = new Intl.Locale(locale).toString();
    result = {
      support: "supported",
      detail: `locale "${locale}" parses via Intl.Locale (normalized "${normalized}")`,
    };
  } catch (e) {
    result = {
      support: "error",
      detail: `Intl.Locale("${locale}") threw: ${errMessage(e)}`,
    };
  }
  useAutoReport(result);
  return <Code>{locale}</Code>;
}

const DEVICE_TYPES = ["mobile", "tablet", "desktop", "unknown"] as const;

function DeviceType() {
  const { userAgent } = useUser();
  const type = userAgent.device.type;
  const valid = (DEVICE_TYPES as readonly string[]).includes(type);
  const result: MemberResult = valid
    ? { support: "supported", detail: `device.type is "${type}"` }
    : {
        support: "error",
        detail: `device.type "${type}" is not one of ${DEVICE_TYPES.join("/")}`,
      };
  useAutoReport(result);
  return <Code>{type}</Code>;
}

function Capabilities() {
  const { userAgent } = useUser();
  const { hover, touch } = userAgent.capabilities;
  const valid = typeof hover === "boolean" && typeof touch === "boolean";
  const result: MemberResult = valid
    ? {
        support: "supported",
        detail: `capabilities are booleans: { hover: ${hover}, touch: ${touch} }`,
      }
    : {
        support: "error",
        detail: `capabilities are not both booleans: ${JSON.stringify({ hover, touch })}`,
      };
  useAutoReport(result);
  return <CodeBlock>{JSON.stringify({ hover, touch }, null, 2)}</CodeBlock>;
}

export const useUserHook: HookDef = {
  name: "useUser",
  source: "skybridge/web",
  docPath: "use-user",
  summary: "Locale and device / input capabilities.",
  members: [
    {
      id: "useUser.locale",
      name: "locale",
      description:
        "useUser().locale parses via new Intl.Locale(locale) without throwing.",
      kind: "auto",
      Test: Locale,
    },
    {
      id: "useUser.device",
      name: "userAgent.device.type",
      description:
        "useUser().userAgent.device.type is one of mobile, tablet, desktop or unknown.",
      kind: "auto",
      Test: DeviceType,
    },
    {
      id: "useUser.capabilities",
      name: "userAgent.capabilities",
      description:
        "useUser().userAgent.capabilities.hover and .touch are both booleans.",
      kind: "auto",
      Test: Capabilities,
    },
  ],
};
