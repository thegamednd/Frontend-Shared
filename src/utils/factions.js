// Pure faction helpers. The API pre-filters what players receive, so these
// compute over whatever data the viewer legitimately has.

export function membershipsOf(character) {
    return Array.isArray(character?.Factions) ? character.Factions : [];
}

export function isMemberOfFaction(character, factionId) {
    return membershipsOf(character).some((m) => m.FactionID === factionId);
}

export function membersOfFaction(characters, factionId) {
    return (characters || []).filter((c) => isMemberOfFaction(c, factionId));
}

// DM-side badge: a member the players cannot see (hidden character or secret membership).
export function isHiddenMember(character, factionId) {
    const membership = membershipsOf(character).find((m) => m.FactionID === factionId);
    return character?.Known === false || !membership || membership.Known !== true;
}

// The single definition of "a viewer may see this character in this faction":
// the character is visible, the membership is marked known, and the faction
// itself is known. Both the membership line and the member-card crests use it.
export function knownFactionsOf(character, factions) {
    if (!character || character.Known === false) return [];
    const byId = new Map((factions || []).map((f) => [f.ID, f]));
    return membershipsOf(character)
        .filter((m) => m.Known === true)
        .map((m) => byId.get(m.FactionID))
        .filter((f) => f && f.Known !== false);
}

// "Member of the Harpers, Lords" — empty string when nothing is visible.
export function factionMembershipLine(character, factions) {
    const names = knownFactionsOf(character, factions).map((f) => f.Name);
    return names.length ? `Member of the ${names.join(', ')}` : '';
}

export function toggleMembership(memberships, factionId, assigned) {
    const list = (memberships || []).filter((m) => m.FactionID !== factionId);
    if (assigned) list.push({ FactionID: factionId, Known: false });
    return list;
}

export function setMembershipKnown(memberships, factionId, known) {
    return (memberships || []).map((m) =>
        m.FactionID === factionId ? { ...m, Known: known === true } : m);
}
