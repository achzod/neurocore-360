import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SSR_CACHE_CONTROL,
  INTERACTIVE_FLOW_CACHE_CONTROL,
  resolveSsrCacheControl,
} from "./cachePolicy";

test("SSR content pages keep the default one-hour cache", () => {
  assert.equal(resolveSsrCacheControl(), DEFAULT_SSR_CACHE_CONTROL);
});

test("interactive forms can force a fresh SPA shell", () => {
  assert.equal(
    resolveSsrCacheControl(INTERACTIVE_FLOW_CACHE_CONTROL),
    "no-cache, no-store, must-revalidate",
  );
});
