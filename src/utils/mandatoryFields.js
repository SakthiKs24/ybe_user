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
  if (!userData) return false;

  const hasProfileInfo = !!(userData.name && userData.dateOfBirth);
  const hasGender = !!userData.userGender;
  const photoUrls = userData.profileImageUrls || [];
  const hasEnoughPhotos = photoUrls.filter((url) => url && String(url).trim()).length >= 3;

  return hasProfileInfo && hasGender && hasEnoughPhotos;
}

/** Routes that are allowed when mandatory fields are incomplete (user can only use these until complete). */
export const ALLOWED_ROUTES_WHEN_INCOMPLETE = ['/profile', '/profile-setup'];

/** Returns true if pathname is allowed when mandatory incomplete (exact match only; /profile/:id is not allowed). */
export function isAllowedRouteWhenIncomplete(pathname) {
  return pathname === '/profile' || pathname === '/profile-setup';
}

export const MANDATORY_INCOMPLETE_MESSAGE =
  'Please update mandatory fields by uploading at least 3 profile photos.';
