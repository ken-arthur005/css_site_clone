import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import { registerHooks } from "node:module";
import { test } from "node:test";
import roster from "../docs/committee_members.json" with { type: "json" };

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const path = specifier.slice(2);
      return nextResolve(new URL(`../${path}${path.endsWith(".json") ? "" : ".ts"}`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { getCommittees, getAdministration } = await import("@/lib/content/committees");
const { getExecutives } = await import("@/lib/content/executives");

test("every submitted portrait is mapped exactly once to an existing asset, including case-sensitive filenames", async () => {
  const files = await readdir(new URL("../public/committee_members/", import.meta.url));
  const paths = roster.map((member) => member.upload_your_preferred_picture);
  assert.equal(new Set(paths).size, roster.length, "no reused or missing portraits");
  assert.deepEqual(paths.map((path) => path.replace("/committee_members/", "")).sort(), files.sort());
  for (const path of paths) {
    const file = await stat(new URL(`../public${path}`, import.meta.url));
    assert.ok(file.isFile() && file.size > 0, path);
  }
});

test("public committees retain every submitted member once, without submission emails", async () => {
  const committees = await getCommittees();
  const members = committees.flatMap((committee) => committee.members);
  assert.equal(members.length, roster.length);
  assert.equal(new Set(members.map((member) => member.id)).size, roster.length);
  for (const member of members) {
    assert.ok(member.name && member.role && member.preferredName && member.portrait?.src);
    assert.ok(!Object.keys(member).some((key) => /email/i.test(key)));
    assert.ok((await stat(new URL(`../public${member.portrait.src}`, import.meta.url))).size > 0);
  }
  const serialized = JSON.stringify(committees);
  for (const submission of roster) assert.ok(!serialized.includes(submission.email_address));
});

test("committees are alphabetical, with heads before deputies before members", async () => {
  const committees = await getCommittees();
  const names = committees.map((committee) => committee.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
  for (const committee of committees) {
    const ranks = committee.members.map((member) => ["Head", "Deputy Head", "Member"].indexOf(member.role));
    assert.ok(ranks.every((rank) => rank >= 0));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), committee.name);
    assert.match(committee.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

test("missing quotes are omitted, and the owner's abbreviated Aaron portrait match is retained", async () => {
  const members = (await getCommittees()).flatMap((committee) => committee.members);
  for (const name of ["Ernest Boaroug", "Ahaze Haizel Christabel Makafui"]) {
    assert.equal(members.find((member) => member.name === name)?.quote, undefined);
  }
  assert.ok(roster.find((member) => member.full_name === "Blessed Aaron Asare")?.upload_your_preferred_picture.endsWith(" - B. aaron.jpeg"));
});

test("the approved main executives form the final section without mutating their existing content", async () => {
  const sections = await getAdministration();
  const main = sections.at(-1);
  const executives = await getExecutives();
  assert.equal(main.id, "executives");
  assert.equal(main.name, "Executives");
  assert.deepEqual(main.members.map(({ portraitFit, ...member }) => {
    assert.equal(portraitFit, "contain");
    return member;
  }), executives);
  assert.equal(new Set(sections.map((section) => section.id)).size, sections.length);
});
