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

// "Member of the Harpers, Lords" — only when character, faction, and
// membership are all known; empty string otherwise.
export function factionMembershipLine(character, factions) {
    if (!character || character.Known === false) return '';
    const byId = new Map((factions || []).map((f) => [f.ID, f]));
    const names = membershipsOf(character)
        .filter((m) => m.Known === true)
        .map((m) => byId.get(m.FactionID))
        .filter((f) => f && f.Known !== false)
        .map((f) => f.Name);
    return names.length ? `Member of the ${names.join(', ')}` : '';
}
