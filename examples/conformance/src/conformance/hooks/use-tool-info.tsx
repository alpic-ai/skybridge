import { useToolInfo } from "skybridge/web";
import { useToolInfo as useTypedToolInfo } from "@/helpers.js";
import { useAutoReport } from "../context.js";
import type { HookDef, MemberResult } from "../types.js";

const OUTPUT_MARKER = "structured-content-visible-to-model-and-view";
const META_SECRET = "meta-is-view-only";

function InputMember() {
  const { input } = useToolInfo();
  const has = input !== undefined && input !== null;
  useAutoReport(
    has
      ? {
          support: "supported",
          detail: `host delivered tool input: ${JSON.stringify(input)}`,
        }
      : {
          support: "unsupported",
          detail:
            "host did not deliver tool input (renders before args, or none provided)",
        },
  );
  return null;
}

function OutputMember() {
  const { output } = useToolInfo<{ output: { marker?: string } }>();
  let result: MemberResult;
  if (output == null) {
    result = {
      support: "unsupported",
      detail: "host did not deliver structuredContent to the view",
    };
  } else if (output.marker === OUTPUT_MARKER) {
    result = {
      support: "supported",
      detail: "structuredContent delivered to the view",
    };
  } else {
    result = {
      support: "error",
      detail: `unexpected output: ${JSON.stringify(output)}`,
    };
  }
  useAutoReport(result);
  return null;
}

function ResponseMetadataMember() {
  const { responseMetadata } = useToolInfo<{
    responseMetadata: { secret?: string };
  }>();
  let result: MemberResult;
  if (responseMetadata == null) {
    result = {
      support: "unsupported",
      detail: "host did not deliver the tool result _meta to the view",
    };
  } else if (responseMetadata.secret === META_SECRET) {
    result = {
      support: "supported",
      detail:
        "tool result _meta delivered to the view (and kept from the model)",
    };
  } else {
    result = {
      support: "error",
      detail: `unexpected responseMetadata: ${JSON.stringify(responseMetadata)}`,
    };
  }
  useAutoReport(result);
  return null;
}

function TypedHelperMember() {
  const { output, status } = useTypedToolInfo<"conformance">();
  let result: MemberResult;
  if (status === "pending" || output == null) {
    result = {
      support: "unsupported",
      detail: "typed output not delivered yet",
    };
  } else if (output.marker === OUTPUT_MARKER) {
    result = {
      support: "supported",
      detail:
        "generateHelpers' typed useToolInfo delivered the typed structured output",
    };
  } else {
    result = {
      support: "error",
      detail: `unexpected typed output: ${JSON.stringify(output)}`,
    };
  }
  useAutoReport(result);
  return null;
}

export const useToolInfoHook: HookDef = {
  name: "useToolInfo",
  source: "skybridge/web",
  docPath: "use-tool-info",
  summary:
    "Read the rendering tool's input, structuredContent and _meta in the view.",
  members: [
    {
      id: "useToolInfo.input",
      name: "input",
      description: "The arguments the rendering tool was called with.",
      kind: "auto",
      Test: InputMember,
    },
    {
      id: "useToolInfo.output",
      name: "output",
      description: "The tool's structuredContent (model + view audience).",
      kind: "auto",
      Test: OutputMember,
    },
    {
      id: "useToolInfo.responseMetadata",
      name: "responseMetadata",
      description: "The tool result's _meta (view-only audience).",
      kind: "auto",
      Test: ResponseMetadataMember,
    },
    {
      id: "useToolInfo.generateHelpers",
      name: "generateHelpers (typed)",
      description:
        "The typed useToolInfo from generateHelpers<AppType>() infers output.",
      kind: "auto",
      Test: TypedHelperMember,
    },
  ],
};
