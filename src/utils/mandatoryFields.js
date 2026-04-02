/**
 * Mandatory profile fields that must be complete before user can access
 * Dashboard, Matches, Messages, Favorites, Upgrade, etc.
 * User can only access Profile (and profile-setup) until mandatory fields are done.
 */

/**
 * Check if user has completed all mandatory profile fields.
 * Mandatory: profile information (name, dateOfBirth), gender (userGender), profile photos (at least 3).
 * @param {Object} userData - User document from Firestore (e.g. { name, dateOfBirth, userGender, profileImageUrls, ... })
 * @returns {boolean}
 */
export function isMandatoryComplete(userData) {
  return getMandatoryMissingFields(userData).length === 0;
}

/**
 * Returns a list of missing mandatory field labels for UI messages.
 * @param {Object} userData
 * @returns {string[]}
 */
export function getMandatoryMissingFields(userData) {
  const missing = [];

  if (!userData?.name) missing.push('name');
  if (!userData?.dateOfBirth) missing.push('date of birth');
  if (!userData?.userGender) missing.push('gender');

  const photoUrls = userData?.profileImageUrls || [];
  const photoCount = photoUrls.filter((url) => url && String(url).trim()).length;
  if (photoCount < 3) missing.push('at least 3 profile photos');

  return missing;
}

/**
 * Creates a user-friendly mandatory incomplete message.
 * @param {Object} userData
 * @returns {string}
 */
export function getMandatoryIncompleteMessage(userData) {
  const missing = getMandatoryMissingFields(userData);
  if (missing.length === 0) return 'Mandatory fields are complete.';
  return `Please complete mandatory fields: ${missing.join(', ')}.`;
}

/** Routes that are allowed when mandatory fields are incomplete (user can only use these until complete). */
export const ALLOWED_ROUTES_WHEN_INCOMPLETE = ['/profile', '/profile-setup'];

/** Returns true if pathname is allowed when mandatory incomplete (exact match only; /profile/:id is not allowed). */
export function isAllowedRouteWhenIncomplete(pathname) {
  return pathname === '/profile' || pathname === '/profile-setup';
}

export const MANDATORY_INCOMPLETE_MESSAGE =
  'Please update mandatory fields by uploading at least 3 profile photos.';
