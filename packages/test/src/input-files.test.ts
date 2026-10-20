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
