/**
 * boothImportAccess
 * ─────────────────────────────────────────────────────────────────────
 * Who may create, replace, edit or delete a booth roll.
 *
 * This is an explicit account allowlist, NOT a role check. Importing a roll
 * writes millions of rows and deleting one destroys them, so the gate is
 * "this specific person", not "anyone who happens to hold a role". A role
 * check would silently widen the moment another account is given that role.
 *
 * Reading booth data is unaffected — that stays governed by the caller's
 * constituency scope, exactly as before. This module only gates writes.
 *
 * Configure with BOOTH_IMPORT_ALLOWLIST (comma-separated emails) to change
 * it without a deploy; the default below is the account currently trusted
 * with it. Matching is case- and whitespace-insensitive.
 */

const { normalizeEmail } = require('../utils/authIdentity');

const DEFAULT_ALLOWLIST = ['sreenu@gmail.com'];

const ALLOWLIST = new Set(
    (process.env.BOOTH_IMPORT_ALLOWLIST
        ? String(process.env.BOOTH_IMPORT_ALLOWLIST).split(',')
        : DEFAULT_ALLOWLIST
    ).map(normalizeEmail).filter(Boolean),
);

/** True if this user may mutate booth rolls. */
const canManageBoothRolls = (user) => ALLOWLIST.has(normalizeEmail(user?.email));

/** For logging / diagnostics — never returned to a client. */
const allowlistSize = () => ALLOWLIST.size;

module.exports = { canManageBoothRolls, allowlistSize };
