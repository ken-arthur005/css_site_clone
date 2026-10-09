import { committeeMembers } from "@/content/committees";
import { getExecutives } from "@/lib/content/executives";
import type { Committee, CommitteeMember } from "@/types/committee";

const roleOrder: Record<string, number> = { Head: 0, "Deputy Head": 1, Member: 2 };

export async function getCommittees(): Promise<readonly Committee[]> {
  const groups = new Map<string, CommitteeMember[]>();
  for (const member of committeeMembers) {
    if (!member.committee) continue;
    const members = groups.get(member.committee) ?? [];
    members.push(member);
    groups.set(member.committee, members);
  }

  return [...groups.entries()]
    .sort(([first], [second]) => {
      // Deputies follow all committees, immediately before the executive team.
      if (first === "Deputies") return 1;
      if (second === "Deputies") return -1;
      return first.localeCompare(second, "en");
    })
    .map(([name, members]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""),
      name,
      members: members.sort((first, second) =>
        (roleOrder[first.role] ?? 3) - (roleOrder[second.role] ?? 3) || first.order - second.order,
      ),
    }));
}

export async function getAdministration(): Promise<readonly Committee[]> {
  const [committees, executives] = await Promise.all([getCommittees(), getExecutives()]);
  return [...committees, {
    id: "executives",
    name: "Executives",
    members: executives.map((executive) => ({ ...executive, portraitFit: "contain" as const })),
  }];
}
