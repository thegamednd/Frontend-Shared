/**
 * Convert an email address to a valid Cognito username
 * - Replaces @ with _at_
 * - Replaces . with _dot_
 * - Replaces + with _plus_
 * - Removes any other special characters
 * - Ensures uniqueness by preserving the full email structure
 */
export function emailToUsername(email) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  // Convert to lowercase for consistency
  let username = email.toLowerCase();
  
  // Replace special characters with word equivalents
  username = username
    .replace(/@/g, '_at_')
    .replace(/\./g, '_dot_')
    .replace(/\+/g, '_plus_')
    .replace(/-/g, '_dash_')
    .replace(/[^a-z0-9_]/g, '_'); // Replace any remaining special chars with underscore
  
  // Remove any consecutive underscores
  username = username.replace(/_+/g, '_');
  
  // Remove leading/trailing underscores
  username = username.replace(/^_+|_+$/g, '');
  
  // Ensure the username is not too long (Cognito limit is 128 characters)
  if (username.length > 128) {
    // If too long, use a hash suffix to ensure uniqueness
    const crypto = window.crypto || window.msCrypto;
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const hash = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    username = username.substring(0, 112) + '_' + hash;
  }
  
  return username;
}

/**
 * Store the email-to-username mapping locally for sign-in purposes
 * This helps users who try to sign in with their email
 */
export function storeEmailUsernameMapping(email, username) {
  try {
    const mappings = JSON.parse(localStorage.getItem('emailUsernameMappings') || '{}');
    mappings[email.toLowerCase()] = username;
    localStorage.setItem('emailUsernameMappings', JSON.stringify(mappings));
  } catch (error) {
    console.error('Failed to store email-username mapping:', error);
  }
}

/**
 * Retrieve the username for a given email from local storage
 */
export function getUsernameFromEmail(email) {
  try {
    const mappings = JSON.parse(localStorage.getItem('emailUsernameMappings') || '{}');
    return mappings[email.toLowerCase()] || null;
  } catch (error) {
    console.error('Failed to retrieve email-username mapping:', error);
    return null;
  }
}

/**
 * Parse a full name into given name and family name
 * Returns null if the name doesn't have at least two parts
 */
export function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return null;
  }
  
  // Trim and normalize whitespace
  const trimmedName = fullName.trim().replace(/\s+/g, ' ');
  
  // Split by space
  const parts = trimmedName.split(' ');
  
  // Need at least first and last name
  if (parts.length < 2) {
    return null;
  }
  
  // If exactly 2 parts, it's simple
  if (parts.length === 2) {
    return {
      givenName: parts[0],
      familyName: parts[1]
    };
  }
  
  // For 3+ parts, treat everything except the last as given name
  // Examples: "John Paul Smith" -> givenName: "John Paul", familyName: "Smith"
  const familyName = parts[parts.length - 1];
  const givenName = parts.slice(0, -1).join(' ');
  
  return {
    givenName,
    familyName
  };
}