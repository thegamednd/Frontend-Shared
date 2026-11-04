// Prod's Google sign-in maps family_name to Google's full name, because
// family_name is required on the pool and some Google accounts have no surname.
// Cognito rewrites it at every login, so it is cleaned on read rather than stored.
const isFederated = (identities) => {
    if (!identities) return false;
    if (Array.isArray(identities)) return identities.length > 0;
    return identities !== '[]';
};

export function cleanFamilyName(givenName, familyName, identities) {
    const given = (givenName || '').trim();
    const family = (familyName || '').trim();
    if (!given || !isFederated(identities)) return family;
    if (family === given) return '';
    if (family.startsWith(`${given} `)) return family.slice(given.length + 1).trim();
    if (family.endsWith(` ${given}`)) return family.slice(0, -given.length - 1).trim();
    return family;
}

export function joinName(firstName, lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
}
