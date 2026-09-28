import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { deletePost, listPosts, publicConfig, readPost, validateProjects, validateSite, writePost } from "./validate.mjs";

const site = JSON.parse(readFileSync(new URL("../content/site.json", import.meta.url), "utf8"));
const projects = JSON.parse(readFileSync(new URL("../content/projects.json", import.meta.url), "utf8"));

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

test("current site config and projects pass the same checks as the local admin", () => {
  validateSite(site);
  validateProjects(projects);
});

test("private terms are rejected", () => {
  const copy = JSON.parse(JSON.stringify(site));
  copy.identity.who = "张泽涛";
  assert.throws(() => validateSite(copy), /不能写入公开页面/);
});

test("public config omits an unpublished resume", () => {
  const published = publicConfig(site);
  assert.deepEqual(published.resume, { enabled: false, show_in_nav: false });
  assert.equal(Object.hasOwn(published.resume, "summary"), false);
});

test("the public hash matches the Python build", () => {
  const python = execFileSync("python3", ["-c", "import json,sys; sys.path.insert(0,'site/src'); from content_store import config_hash, load_site; print(config_hash(load_site()))"], {
    cwd: new URL("../..", import.meta.url).pathname,
    encoding: "utf8",
  }).trim();
  const bytes = new TextEncoder().encode(canonical(publicConfig(site)));
  return crypto.subtle.digest("SHA-256", bytes).then((buffer) => {
    const hex = [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
    assert.equal(hex, python);
  });
});

test("a legacy post can be read and a private post is rejected", () => {
  const markdown = readFileSync(new URL("../../content/posts/my-first-post.md", import.meta.url), "utf8");
  const store = { "my-first-post.md": markdown };
  const listed = listPosts(store);
  assert.equal(listed[0].slug, "my-first-post");
  assert.equal(listed[0].draft, true);
  const post = readPost(store, "my-first-post.md");
  post.body = "这里提到张泽涛";
  assert.throws(() => writePost(store, post), /不能公开/);
  const removed = deletePost(store, "my-first-post.md");
  assert.equal(Object.keys(removed).length, 0);
});
