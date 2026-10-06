import assert from "node:assert/strict";
import test from "node:test";
import { discussionId, parseKit, saveKit } from "./kit-state.js";

const product = {
  id: "p",
  options: [],
  card: { title: "Goggles", media: [], specs: [] },
  variants: [
    { id: "v", title: "Goggles", media: [], specs: [], selection: {} },
  ],
};
test("persisted kit accepts real variants but rejects malformed or stale records", () => {
  const valid = { product, variantId: "v", quantity: 2 };
  assert.deepEqual(
    parseKit([
      valid,
      { ...valid, variantId: "removed" },
      { ...valid, quantity: 100 },
      { ...valid, product: { ...product, card: null } },
    ]),
    [valid],
  );
  assert.deepEqual(parseKit({ items: [valid] }), []);
});
test("blocked storage does not notify another view to overwrite in-memory changes", () => {
  let notified = false;
  assert.equal(
    saveKit(
      {
        setItem() {
          throw new Error("blocked");
        },
      },
      "conversation-a",
      [],
      () => {
        notified = true;
      },
    ),
    false,
  );
  assert.equal(notified, false);
});
test("kit scopes and exact discussion variants cannot alias", () => {
  assert.notEqual(discussionId("a:b", "c"), discussionId("a", "b:c"));
  const saved = new Map<string, string>();
  const storage = {
    setItem(key: string, value: string) {
      saved.set(key, value);
    },
  };
  saveKit(
    storage,
    "conversation-a",
    [{ product, variantId: "v", quantity: 1 }],
    () => {},
  );
  saveKit(storage, "conversation-b", [], () => {});
  assert.equal(
    parseKit(JSON.parse(saved.get("conversation-a") ?? "[]")).length,
    1,
  );
  assert.deepEqual(
    parseKit(JSON.parse(saved.get("conversation-b") ?? "[]")),
    [],
  );
});

test("discussion updates lock concurrent actions, retain prior attachments, and follow host clearing", async () => {
  const { reconcileDiscussion, updateDiscussion } = await import(
    "../components/discussion-state.js"
  );
  reconcileDiscussion(null);
  let release: (() => void) | undefined;
  const first = updateDiscussion(
    () => [{ type: "text", text: "variant-a" }],
    async () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  let concurrentSent = false;
  await updateDiscussion(
    () => [],
    async () => {
      concurrentSent = true;
    },
  );
  assert.equal(concurrentSent, false);
  release?.();
  await first;
  await updateDiscussion(
    (content) => {
      assert.equal(content[0]?.type, "text");
      assert.equal(content.length, 1);
      return [...content, { type: "text", text: "variant-b" }];
    },
    async (content) => {
      assert.equal(content.length, 2);
    },
  );
  reconcileDiscussion({
    updateId: "host-has-attachments",
    content: [{ type: "text", text: "variant-b" }],
  });
  reconcileDiscussion(null);
  await updateDiscussion(
    (content) => {
      assert.deepEqual(content, []);
      return content;
    },
    async () => {},
  );
});

test("product links preserve exact variant and encode plugin and path independently", async () => {
  const { productDeepLink } = await import("./kit-state.js");
  assert.equal(productDeepLink(null, "p", "v"), null);
  const url = new URL(
    productDeepLink("plugin/a", "product/b", "variant & blue") ?? "",
  );
  assert.equal(url.pathname, "/plugins/plugin%2Fa/app/shop");
  assert.equal(
    url.searchParams.get("path"),
    "/products/product%2Fb?variant=variant%20%26%20blue",
  );
});
