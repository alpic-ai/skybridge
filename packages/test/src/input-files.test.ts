import type { FilePart } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { FileRef, Skybridge } from "skybridge/server";
import { expect, it } from "vitest";
import { z } from "zod";
import "./matchers/index.js";
import { start } from "./session-registry.js";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
  totalTokens: 2,
};

function portrait(filename = "photo.png"): FilePart {
  return {
    type: "file",
    mediaType: "image/png",
    filename,
    data: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=",
      "base64",
    ),
  };
}

function fileApp(seen: FileRef[]) {
  const consume = async (files: FileRef[]) => {
    seen.push(...files);
    const downloads = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(file.download_url);
        expect(response.headers.get("content-type")).toBe(file.mime_type);
        return Buffer.from(await response.arrayBuffer()).toString("base64");
      }),
    );
    return { content: JSON.stringify(downloads) };
  };
  return new Skybridge({
    name: "file-eval",
    version: "0.0.0",
    handler: (server) =>
      server
        .registerTool(
          {
            name: "resize",
            inputSchema: { file: FileRef, width: z.number() },
            _meta: { "openai/fileParams": ["file"] },
          },
          ({ file }) => consume([file]),
        )
        .registerTool(
          {
            name: "upload",
            inputSchema: { files: z.array(FileRef) },
            _meta: { "openai/fileParams": ["files"] },
          },
          ({ files }) => consume(files),
        )
        .registerTool(
          { name: "plain", inputSchema: { imageURI: z.string() } },
          async ({ imageURI }) => ({ content: imageURI }),
        ),
  });
}

function fileModel(
  toolName: string,
  input: (
    files: { uploaded_name: string; workspace_path: string }[],
  ) => Record<string, unknown>,
) {
  let call = 0;
  return new MockLanguageModelV3({
    doGenerate: async ({ prompt }) => {
      call += 1;
      const files = prompt
        .filter((message) => message.role === "user")
        .flatMap((message) => message.content)
        .filter((part) => part.type === "text")
        .flatMap((part) => {
          const match = part.text.match(/^Attached file: (.+)$/);
          return match?.[1]
            ? [
                JSON.parse(match[1]) as {
                  uploaded_name: string;
                  workspace_path: string;
                },
              ]
            : [];
        });
      return {
        content:
          call % 2 === 1
            ? [
                {
                  type: "tool-call" as const,
                  toolCallId: "call-1",
                  toolName,
                  input: JSON.stringify(input(files)),
                },
              ]
            : [{ type: "text" as const, text: "Done." }],
        finishReason: {
          unified: call % 2 === 1 ? ("tool-calls" as const) : ("stop" as const),
          raw: undefined,
        },
        usage,
        warnings: [],
      };
    },
  });
}

it("shows paths to the model, rewrites them, and downloads the exact bytes", async () => {
  const part = portrait();
  const seen: FileRef[] = [];
  const model = fileModel("resize", (files) => ({
    file: files[0]?.workspace_path,
    width: 1080,
  }));
  const chat = await start({ app: fileApp(seen), model });
  const matcher = expect.inputFile(part);
  await chat.send([{ type: "text", text: "Resize this photo" }, part]);

  expect.chat(chat).toHaveCalledToolOnce("resize", { file: matcher });
  expect.chat(chat).toHaveCalledToolWith("resize", {
    file: matcher,
    width: expect.any(Number),
  });
  expect(seen).toHaveLength(1);
  expect(seen[0]).toEqual({
    file_id: expect.stringMatching(/^file_/),
    download_url: expect.stringMatching(/^http:\/\/127\.0\.0\.1:/),
    mime_type: "image/png",
    file_name: "photo.png",
  });
  expect(chat.toolCalls[0]?.arguments).toEqual({ file: seen[0], width: 1080 });
  const user = model.doGenerateCalls[0]?.prompt.find(
    (message) => message.role === "user",
  );
  expect(user?.content).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "file", mediaType: "image/png" }),
    ]),
  );
  const modelContext = JSON.stringify(model.doGenerateCalls[0]);
  expect(modelContext).toContain("workspace_path");
  expect(modelContext).toContain("uploaded_name");
  expect(modelContext).toContain(
    "This parameter expects an absolute local file path.",
  );
  expect(modelContext).not.toContain("download_url");
  expect(modelContext).not.toContain("file_id");
  expect(JSON.stringify(model.doGenerateCalls[1]?.prompt)).toContain(
    Buffer.from(part.data as Buffer).toString("base64"),
  );
  await chat.send("Resize the same file again");
  expect(seen[1]).toEqual(seen[0]);
  expect.chat(chat).toHaveCalledToolWith("resize", { file: matcher });
});

it("distinguishes identical uploads by object identity and reports the other id", async () => {
  const first = portrait();
  const second = portrait();
  const seen: FileRef[] = [];
  const chat = await start({
    app: fileApp(seen),
    model: fileModel("resize", (files) => ({
      file: files[1]?.workspace_path,
      width: 1080,
    })),
  });
  await chat.send([first, second]);
  expect.chat(chat).toHaveCalledToolOnce("resize", {
    file: expect.inputFile(second),
  });
  expect(() =>
    expect.chat(chat).toHaveCalledToolWith("resize", {
      file: expect.inputFile(first),
    }),
  ).toThrow(seen[0]?.file_id);
  expect(expect.inputFile({ ...second }).asymmetricMatch(seen[0])).toBe(false);
});

it("rewrites arrays before handlers and stubs, and accepts matchers inside arrays", async () => {
  const first = portrait("first.png");
  const second = portrait("second.png");
  const seen: FileRef[] = [];
  const chat = await start({
    app: fileApp(seen),
    model: fileModel("upload", (files) => ({
      files: files.map((file) => file.workspace_path),
    })),
    stubs: {
      upload: ({ files }) => {
        expect(files).toEqual([
          expect.inputFile(first),
          expect.inputFile(second),
        ]);
        return undefined;
      },
    },
  });
  await chat.send([first, second]);
  expect(seen).toHaveLength(2);
  expect.chat(chat).toHaveCalledToolOnce("upload", {
    files: [expect.inputFile(first), expect.inputFile(second)],
  });
  expect.chat(chat).toHaveCalledToolWith("upload", {
    files: expect.inputFile(second),
  });
});

it.each([
  "workspace_path",
  "file_id",
  "download_url",
  "object",
  "array",
] as const)("matches %s and rejects invented references", async (shape) => {
  const part = portrait();
  const seen: FileRef[] = [];
  let workspace_path: string | undefined;
  const chat = await start({
    app: fileApp(seen),
    model: fileModel("resize", (files) => {
      workspace_path = files[0]?.workspace_path;
      return { file: workspace_path, width: 1080 };
    }),
  });
  await chat.send([part]);
  expect.chat(chat).toHaveCalledToolWith("resize", {
    file: expect.inputFile(part),
  });
  const attached = seen[0];
  const matcher = expect.inputFile(part);
  const value =
    shape === "workspace_path"
      ? workspace_path
      : shape === "object"
        ? attached
        : shape === "array"
          ? ["other", attached]
          : attached?.[shape];
  expect(matcher.asymmetricMatch(value)).toBe(true);
  expect(matcher.asymmetricMatch("https://invented.test/photo.png")).toBe(
    false,
  );
  expect(
    matcher.asymmetricMatch({ ...attached, download_url: "https://wrong" }),
  ).toBe(false);
  expect(matcher.asymmetricMatch({ ...attached, file_id: "file_wrong" })).toBe(
    false,
  );
});

it("rejects unknown file paths without calling the handler", async () => {
  const seen: FileRef[] = [];
  const chat = await start({
    app: fileApp(seen),
    model: fileModel("resize", () => ({
      file: "/workspace/scratch/missing/input",
      width: 1080,
    })),
  });
  await chat.send([portrait()]);
  expect(seen).toEqual([]);
  expect.chat(chat).toHaveFailedToolCall("resize");
  expect(chat.toolCalls[0]).toEqual({
    name: "resize",
    arguments: { file: "/workspace/scratch/missing/input", width: 1080 },
    failed: expect.stringContaining(
      "Unknown input file path: /workspace/scratch/missing/input",
    ),
  });
});

it.each(["file_id", "download_url"] as const)(
  "does not accept server-facing %s in place of a model-facing path",
  async (field) => {
    const seen: FileRef[] = [];
    const chat = await start({
      app: fileApp(seen),
      model: fileModel("resize", (files) => ({
        file: seen[0]?.[field] ?? files[0]?.workspace_path,
        width: 1080,
      })),
    });
    await chat.send([portrait()]);
    await chat.send("Resize the file again");
    expect(seen).toHaveLength(1);
    expect(chat.toolCalls[1]).toEqual({
      name: "resize",
      arguments: { file: seen[0]?.[field], width: 1080 },
      failed: expect.stringContaining("Unknown input file path"),
    });
  },
);

it.each([false, true])(
  "rejects file expectations on undeclared parameters before a turn, including nested matchers (negated: %s)",
  async (negated) => {
    const chat = await start({
      app: fileApp([]),
      model: fileModel("plain", () => ({ imageURI: "https://example.test" })),
    });
    const file = expect.inputFile(portrait());
    const assertion = negated ? expect.chat(chat).not : expect.chat(chat);
    for (const value of [
      file,
      [file],
      expect.arrayContaining([file]),
      { nested: file },
    ]) {
      expect(() =>
        assertion.toHaveCalledToolWith("plain", { imageURI: value } as never),
      ).toThrow(
        '"plain.imageURI": "imageURI" is not listed in openai/fileParams',
      );
      expect(() =>
        assertion.toHaveCalledToolOnce("plain", { imageURI: value } as never),
      ).toThrow(
        '"plain.imageURI": "imageURI" is not listed in openai/fileParams',
      );
    }
    expect(() =>
      assertion.toHaveCalledToolWith("resize", { width: file }),
    ).toThrow('"resize.width": "width" is not listed in openai/fileParams');
    expect(() =>
      assertion.toHaveCalledToolOnce("resize", { width: file }),
    ).toThrow('"resize.width": "width" is not listed in openai/fileParams');
    expect(chat.toolCalls).toEqual([]);
  },
);

it("keeps ordinary URL arguments and expectations unchanged", async () => {
  const chat = await start({
    app: fileApp([]),
    model: fileModel("plain", () => ({
      imageURI: "https://example.test/photo.png",
    })),
  });
  await chat.send([portrait()]);
  expect.chat(chat).toHaveCalledToolOnce("plain", {
    imageURI: "https://example.test/photo.png",
  });
});

it.each(["resize", "upload"] as const)(
  "rejects the wrong single-file or list shape for %s before handlers and stubs",
  async (toolName) => {
    for (const stubbed of [false, true]) {
      const seen: FileRef[] = [];
      const stubInputs: unknown[] = [];
      const chat = await start({
        app: fileApp(seen),
        model: fileModel(toolName, (files) =>
          toolName === "resize"
            ? { file: [files[0]?.workspace_path], width: 1080 }
            : { files: files[0]?.workspace_path },
        ),
        stubs: stubbed
          ? {
              resize: (input) => {
                stubInputs.push(input);
                return "stubbed";
              },
              upload: (input) => {
                stubInputs.push(input);
                return "stubbed";
              },
            }
          : undefined,
      });
      await chat.send([portrait()]);
      expect(stubInputs).toEqual([]);
      expect(seen).toEqual([]);
      expect(chat.toolCalls[0]?.failed).toBe(
        "the model's arguments could not be parsed",
      );
    }
  },
);

it.each(["omitted", "null", "empty", "paths", "objects"] as const)(
  "preserves optional and nullable file lists and their size limits: %s",
  async (shape) => {
    const received: unknown[] = [];
    const app = new Skybridge({
      name: "optional-file-eval",
      version: "0.0.0",
      handler: (server) =>
        server.registerTool(
          {
            name: "upload",
            inputSchema: {
              files: z.array(FileRef).min(1).nullable().optional(),
            },
            _meta: { "openai/fileParams": ["files"] },
          },
          async () => ({ content: "uploaded" }),
        ),
    });
    const part = portrait();
    const chat = await start({
      app,
      model: fileModel("upload", (files) => {
        if (shape === "omitted") {
          return {};
        }
        return {
          files:
            shape === "null"
              ? null
              : shape === "empty"
                ? []
                : shape === "paths"
                  ? [files[0]?.workspace_path]
                  : [
                      {
                        file_id: "file_invented",
                        download_url: "https://invented.test",
                      },
                    ],
        };
      }),
      stubs: {
        upload: ({ files }) => {
          received.push(files);
          return "stubbed";
        },
      },
    });
    await chat.send([part]);
    if (shape === "empty" || shape === "objects") {
      expect(received).toEqual([]);
      expect.chat(chat).toHaveFailedToolCall("upload");
    } else {
      expect.chat(chat).toHaveCalledToolOnce("upload");
      expect(received).toEqual([
        shape === "omitted"
          ? undefined
          : shape === "null"
            ? null
            : [expect.inputFile(part)],
      ]);
    }
  },
);

it("records current arguments and failures when a model reuses a call id across turns", async () => {
  const seen: FileRef[] = [];
  let attempt = 0;
  const chat = await start({
    app: fileApp(seen),
    model: fileModel("resize", (files) => {
      attempt += 1;
      return {
        file:
          attempt === 2
            ? "/workspace/scratch/missing/input"
            : files[0]?.workspace_path,
        width: 1080,
      };
    }),
  });
  await chat.send([portrait()]);
  const firstCall = chat.toolCalls[0];
  await chat.send("Try a different file");
  expect(chat.toolCalls[0]).toEqual(firstCall);
  expect(chat.toolCalls[1]).toEqual({
    name: "resize",
    arguments: { file: "/workspace/scratch/missing/input", width: 1080 },
    failed: expect.stringContaining(
      "Unknown input file path: /workspace/scratch/missing/input",
    ),
  });
  await chat.send("Use the original file again");
  expect(chat.toolCalls[2]).toEqual(firstCall);
  expect(seen).toHaveLength(2);
});

it.each([
  Buffer.from("attachment"),
  new Uint8Array(Buffer.from("attachment")),
  Uint8Array.from(Buffer.from("attachment")).buffer,
  Buffer.from("attachment").toString("base64"),
  { type: "data", data: Buffer.from("attachment") },
  { type: "text", text: "attachment" },
  new URL("data:text/plain;base64,YXR0YWNobWVudA=="),
  { type: "url", url: new URL("data:text/plain;base64,YXR0YWNobWVudA==") },
] satisfies FilePart["data"][])(
  "serves AI SDK file data %# and expires the download at close",
  async (data) => {
    const seen: FileRef[] = [];
    const part: FilePart = { type: "file", mediaType: "text/plain", data };
    const chat = await start({
      app: fileApp(seen),
      model: fileModel("resize", (files) => ({
        file: files[0]?.workspace_path,
        width: 1,
      })),
    });
    await chat.send([part]);
    expect.chat(chat).toHaveCalledToolWith("resize", {
      file: expect.inputFile(part),
    });
    const url = seen[0]?.download_url ?? "";
    expect(await (await fetch(url)).text()).toBe("attachment");
    await chat.close();
    await expect(fetch(url)).rejects.toThrow();
    expect.chat(chat).toHaveCalledToolWith("resize", {
      file: expect.inputFile(part),
    });
  },
);
