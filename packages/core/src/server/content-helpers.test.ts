import { describe, expect, it } from "vitest";
import {
  audio,
  embeddedResource,
  image,
  resourceLink,
  text,
} from "./content-helpers.js";

describe("text", () => {
  it("returns a TextContent without annotations when none given", () => {
    expect(text("hello")).toEqual({ type: "text", text: "hello" });
  });

  it("includes annotations when provided", () => {
    expect(text("hi", { priority: 1 })).toEqual({
      type: "text",
      text: "hi",
      annotations: { priority: 1 },
    });
  });
});

describe("image", () => {
  it("base64-encodes Uint8Array data", () => {
    const bytes = new Uint8Array([104, 105]);
    expect(image(bytes, "image/png")).toEqual({
      type: "image",
      data: "aGk=",
      mimeType: "image/png",
    });
  });

  it("passes string data through unchanged (caller is responsible for base64)", () => {
    expect(image("YWxyZWFkeS1iNjQ=", "image/png")).toEqual({
      type: "image",
      data: "YWxyZWFkeS1iNjQ=",
      mimeType: "image/png",
    });
  });
});

describe("audio", () => {
  it("base64-encodes Uint8Array data", () => {
    const bytes = new Uint8Array([104, 105]);
    expect(audio(bytes, "audio/mpeg")).toMatchObject({
      type: "audio",
      data: "aGk=",
      mimeType: "audio/mpeg",
    });
  });
});

describe("embeddedResource", () => {
  it("wraps a text resource with a type tag", () => {
    expect(
      embeddedResource({
        uri: "file:///a.txt",
        mimeType: "text/plain",
        text: "x",
      }),
    ).toEqual({
      type: "resource",
      resource: { uri: "file:///a.txt", mimeType: "text/plain", text: "x" },
    });
  });

  it("wraps a blob resource with a type tag", () => {
    expect(embeddedResource({ uri: "file:///a.bin", blob: "YmFy" })).toEqual({
      type: "resource",
      resource: { uri: "file:///a.bin", blob: "YmFy" },
    });
  });
});

describe("resourceLink", () => {
  it("spreads link fields alongside the type tag", () => {
    expect(resourceLink({ uri: "file:///a", name: "a", title: "A" })).toEqual({
      type: "resource_link",
      uri: "file:///a",
      name: "a",
      title: "A",
    });
  });
});
