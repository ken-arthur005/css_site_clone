import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const { editChanges } = await import("@/lib/admin/order-edits");

const piece = (id, extra = {}) => ({ id, slot: "", label: "CSS Tee", product: 1, quantity: 1, size: "M", colorway: "black-pink", back: "spec-sheet", fit: "regular", back_name: "", print_run: null, handed_at: null, handed_by: null, handed_to: "", ...extra });
const order = {
  code: "1234567", buyer_name: "Ama Mensah", buyer_phone: "+233241234567", buyer_email: "", hall: "",
  items: [{ id: 10, product_name: "CSS Tee", quantity: 1, pieces: [piece(1)] }, { id: 11, product_name: "Root Access", quantity: 1, pieces: [piece(2, { slot: "tee" })] }],
};
const buyer = { name: "Ama Mensah", phone: "+233241234567", email: "", hall: "" };
const exec = { person_name: "Esi", committee: "Developers", role: "Committee head" };

test("nothing changed sends nothing", () => {
  assert.deepEqual(editChanges(order, buyer, { 1: { size: "M" } }, { 11: { ...exec } }, { 11: exec }), {});
});

test("only the fields that differ are sent", () => {
  const changes = editChanges(order, { ...buyer, hall: " Unity " }, { 1: { size: "L", colorway: "black-pink" }, 99: { size: "S" } }, { 11: { ...exec, committee: "Events" } }, { 11: exec });
  assert.deepEqual(changes, { buyer: { hall: " Unity " }, pieces: { 1: { size: "L" } }, items: { 11: { committee: "Events" } } });
});
