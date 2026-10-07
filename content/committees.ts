import roster from "@/docs/committee_members.json" with { type: "json" };
import type { CommitteeMember } from "@/types/committee";

function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function displayName(value: string) {
  const name = value.trim().replace(/\.$/, "");
  return name === name.toUpperCase()
    ? name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
    : name;
}

function displayQuote(value: string) {
  const quote = value.trim();
  if (!quote || /^(n\/a|none)$/i.test(quote)) return undefined;
  // Remove only a matching outer pair; preserve the submitted wording and attribution.
  return quote.replace(/^(?:"([\s\S]*)"|“([\s\S]*)”)$/, (_, straight, curly) => straight ?? curly);
}

// This adapter is used by server-side accessors only. The submission's email
// addresses are deliberately excluded from the public content contract.
export const committeeMembers: readonly CommitteeMember[] = roster.map((entry, order) => {
  const name = displayName(entry.full_name);
  const slug = slugify(name);
  return {
    id: `committee-member-${slug}`,
    slug,
    name,
    preferredName: entry.preferred_name.trim() || undefined,
    role: entry.role_in_committee,
    committee: entry.committee,
    order,
    contentStatus: "verified",
    portrait: entry.upload_your_preferred_picture ? {
      // Generated from the matched original by tools/prepare-committee-portraits.mjs.
      // The JSON retains the owner's original upload path.
      src: `/executives/committees/${slug}.webp`,
      alt: `${name}, ${entry.role_in_committee} of the ${entry.committee}`,
      contentStatus: "verified",
    } : undefined,
    quote: displayQuote(entry.favourite_quote),
  };
});
