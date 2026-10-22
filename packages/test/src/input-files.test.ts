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
  expect(chat.toolCalls[0]?.arguments).toEqual({
    file: expect.inputFile(second),
    width: 1080,
  });
  expect(chat.toolCalls[0]?.arguments).not.toEqual({
    file: expect.inputFile({ ...second }),
    width: 1080,
  });
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

it.each([false, true])(
  "rejects misplaced input file expectations before any calls (negated: %s)",
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
      expect.objectContaining({ nested: file }),
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
      assertion.toHaveCalledToolWith("resize", { width: file } as never),
    ).toThrow('"resize.width": "width" is not listed in openai/fileParams');
    expect(() =>
      assertion.toHaveCalledToolOnce("resize", { width: file } as never),
    ).toThrow('"resize.width": "width" is not listed in openai/fileParams');
    if (negated) {
      assertion.toHaveCalledToolWith("resize", { file });
      assertion.toHaveCalledToolOnce("upload", { files: [file] });
      assertion.toHaveCalledToolWith("plain", {
        imageURI: "https://example.test",
      });
    }
    expect(chat.toolCalls).toEqual([]);
  },
);

it.each([
  ["a string", z.string()],
  ["an unrelated object", z.object({ url: z.string() })],
  ["an optional identifier", FileRef.partial({ file_id: true })],
  ["a numeric identifier", FileRef.extend({ file_id: z.number() })],
  ["an extra property", FileRef.extend({ extra: z.string().optional() })],
  ["an open object", FileRef.passthrough()],
  ["a mixed union", z.union([FileRef, z.string()])],
  ["a nested array", z.array(z.array(FileRef))],
])(
  "rejects %s declared as a file before model generation",
  async (_, schema) => {
    const model = fileModel("invalid", () => ({}));
    const app = new Skybridge({
      name: "invalid-file-eval",
      version: "0",
      handler: (server) =>
        server.registerTool(
          {
            name: "invalid",
            inputSchema: { file: schema },
            _meta: { "openai/fileParams": ["file"] },
          },
          async () => ({ content: "unexpected" }),
        ),
    });
    await expect(start({ app, model })).rejects.toThrow(
      'Invalid openai/fileParams for "invalid.file"',
    );
    expect(model.doGenerateCalls).toEqual([]);
  },
);

it("rejects a declaration for a missing parameter at start", async () => {
  const app = new Skybridge({
    name: "missing-file-eval",
    version: "0",
    handler: (server) =>
      server.registerTool(
        { name: "invalid", _meta: { "openai/fileParams": ["file"] } },
        async () => ({ content: "unexpected" }),
      ),
  });
  await expect(
    start({ app, model: fileModel("invalid", () => ({})) }),
  ).rejects.toThrow('"invalid.file"');
});

it("preserves optional, nullable, and bounded array file schemas for stubs", async () => {
  const part = portrait();
  const received: unknown[] = [];
  const app = new Skybridge({
    name: "wrapped-file-eval",
    version: "0",
    handler: (server) =>
      server.registerTool(
        {
          name: "wrapped",
          inputSchema: {
            optional: FileRef.optional(),
            nullable: FileRef.nullable(),
            files: z.array(FileRef).min(1).max(2).nullable().optional(),
          },
          _meta: { "openai/fileParams": ["optional", "nullable", "files"] },
        },
        async () => ({ content: "unexpected" }),
      ),
  });
  const model = fileModel("wrapped", (files) => ({
    nullable: null,
    files: [files[0]?.workspace_path],
  }));
  const chat = await start({
    app,
    model,
    stubs: {
      wrapped: (args) => {
        received.push(args);
        return "stubbed";
      },
    },
  });
  await chat.send([part]);
  expect(received).toEqual([
    { nullable: null, files: [expect.inputFile(part)] },
  ]);
  expect
    .chat(chat)
    .toHaveCalledToolOnce("wrapped", { files: [expect.inputFile(part)] });
  const schema = model.doGenerateCalls[0]?.tools?.find(
    (tool) => tool.type === "function" && tool.name === "wrapped",
  );
  expect(schema).toMatchObject({
    inputSchema: {
      required: ["nullable"],
      properties: {
        files: {
          anyOf: [
            {
              type: "array",
              minItems: 1,
              maxItems: 2,
              items: { type: "string" },
            },
            { type: "null" },
          ],
        },
      },
    },
  });
  const invalid = await start({
    app,
    model: fileModel("wrapped", () => ({ nullable: null, files: [] })),
    stubs: {
      wrapped: (args) => {
        received.push(args);
        return "stubbed";
      },
    },
  });
  await invalid.send([part]);
  expect.chat(invalid).toHaveFailedToolCall("wrapped");
  expect(received).toHaveLength(1);
});

it("keeps file schemas on the app and attachments isolated across sessions", async () => {
  const seen: FileRef[] = [];
  const app = fileApp(seen);
  let path = "";
  const first = await start({
    app,
    model: fileModel("resize", (files) => {
      path = files[0]?.workspace_path ?? "";
      return { file: path, width: 100 };
    }),
  });
  const second = await start({
    app,
    model: fileModel("resize", () => ({ file: path, width: 100 })),
  });
  await first.send([portrait()]);
  await second.send("Use the other session's file");
  expect.chat(second).toHaveFailedToolCall("resize");
  expect(seen).toHaveLength(1);
});

it("records current inputs when a model reuses a call ID across sends", async () => {
  let calls = 0;
  const chat = await start({
    app: fileApp([]),
    model: fileModel("resize", (files) => {
      calls += 1;
      return {
        file: calls === 2 ? "/missing" : files[0]?.workspace_path,
        width: calls,
      };
    }),
  });
  const part = portrait();
  await chat.send([part]);
  await chat.send("Try a missing file");
  await chat.send("Try the original again");
  expect(chat.toolCalls.map((call) => call.arguments)).toEqual([
    { file: expect.inputFile(part), width: 1 },
    { file: "/missing", width: 2 },
    { file: expect.inputFile(part), width: 3 },
  ]);
  expect(chat.toolCalls[1]?.failed).toContain("Unknown input file path");
  expect(chat.toolCalls[2]?.failed).toBeUndefined();
});

it.each(["single", "list", "object"])(
  "rejects the wrong %s file shape before handlers or stubs",
  async (shape) => {
    const seen: FileRef[] = [];
    const stubbed: unknown[] = [];
    const name = shape === "list" ? "upload" : "resize";
    const model = fileModel(name, (files) => {
      const path = files[0]?.workspace_path;
      return shape === "list"
        ? { files: path }
        : {
            width: 100,
            file:
              shape === "single"
                ? [path]
                : {
                    file_id: "invented",
                    download_url: "https://example.test",
                    mime_type: "image/png",
                    file_name: "photo.png",
                  },
          };
    });
    const chat = await start({
      app: fileApp(seen),
      model,
      stubs: {
        resize: (args) => {
          stubbed.push(args);
          return "unexpected";
        },
        upload: (args) => {
          stubbed.push(args);
          return "unexpected";
        },
      },
    });
    await chat.send([portrait()]);
    expect.chat(chat).toHaveFailedToolCall(name);
    expect(seen).toEqual([]);
    expect(stubbed).toEqual([]);
  },
);

it("runs eval transformations and stubs inside the app's native middleware pipeline", async () => {
  const events: string[] = [];
  const schemas: unknown[] = [];
  const part = portrait();
  const app = new Skybridge({
    name: "native-file-eval",
    version: "1",
    handler: (server) =>
      server
        .registerTool(
          {
            name: "native",
            inputSchema: { file: FileRef },
            _meta: { "openai/fileParams": ["file"] },
          },
          async () => {
            events.push("handler");
            return { content: "unexpected" };
          },
        )
        .mcpMiddleware("tools/list", async (_request, _extra, next) => {
          const result = await next();
          schemas.push(result.tools[0]?.inputSchema.properties?.file);
          return result;
        })
        .mcpMiddleware("tools/call", async (request, _extra, next) => {
          events.push("app:before");
          expect(typeof request.params.arguments?.file).toBe("string");
          const result = await next();
          expect(request.params.arguments?.file).toEqual(
            expect.inputFile(part),
          );
          events.push("app:after");
          return result;
        }),
  });
  const chat = await start({
    app,
    model: fileModel("native", (files) => ({ file: files[0]?.workspace_path })),
    stubs: {
      native: ({ file }) => {
        expect(file).toEqual(expect.inputFile(part));
        events.push("stub");
        return "stubbed";
      },
    },
  });
  await chat.send([part]);
  expect(schemas).toEqual([
    {
      type: "string",
      description: "This parameter expects an absolute local file path.",
    },
  ]);
  expect(events).toEqual(["app:before", "stub", "app:after"]);
  expect
    .chat(chat)
    .toHaveCalledToolOnce("native", { file: expect.inputFile(part) });
});
