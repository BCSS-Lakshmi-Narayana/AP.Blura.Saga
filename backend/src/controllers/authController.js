const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ConstituencyMaster = require('../models/ConstituencyMaster');
const { createAuditLog } = require('../services/auditService');
const { buildEmailLookup, normalizeEmail, normalizeRole } = require('../utils/authIdentity');
const AP_MLAS = require('../data/ap_mlas.json');
const LS_TO_AC = require('../data/ls_to_ac.json');

const SCOPED_ROLES = new Set(['mla', 'mp', 'nara_lokesh']);

// Static fallback key sets, used only when the DB-backed ConstituencyMaster
// collection has no match for a given seat (e.g. not yet synced in this
// environment). ConstituencyMaster remains the primary/authoritative source.
const AP_MLA_KEYS = new Set(AP_MLAS.map((m) => ConstituencyMaster.normKey(m.constituency)));
const LS_SEAT_KEYS = new Set(Object.keys(LS_TO_AC).map((k) => ConstituencyMaster.normKey(k)));

// Validates `assigned_constituency` against ConstituencyMaster (the
// DB-backed, authoritative AC list used everywhere else in this codebase —
// see scopeMiddleware.buildGeoScope), falling back to the static
// ap_mlas.json seed list only when ConstituencyMaster has no match. This
// guards against a typo silently leaving an MLA scoped to nothing, since
// scopeMiddleware does exact normalized-key matching against this field.
const isValidConstituency = async (name) => {
  const key = ConstituencyMaster.normKey(name);
  if (!key) return false;
  const hit = await ConstituencyMaster.findOne({ ac_key: key }).select('_id').lean();
  if (hit) return true;
  return AP_MLA_KEYS.has(key);
};

// Validates `assigned_lok_sabha` against ls_to_ac.json — the same lookup
// scopeMiddleware's childAcsForLs() uses to expand an MP's LS seat into its
// child ACs, so a mismatch here would otherwise leave the MP scoped to
// nothing.
const isValidLokSabha = (name) => {
  const key = ConstituencyMaster.normKey(name);
  if (!key) return false;
  return LS_SEAT_KEYS.has(key);
};

const buildUserPayload = (user) => {
  const role = normalizeRole(user.role);
  const isSuperAdmin = role === 'superadmin';
  const isScoped = SCOPED_ROLES.has(role);
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_super_admin: isSuperAdmin,
    is_scoped: isScoped,
    is_active: user.is_active !== false,
    assigned_constituency: user.assigned_constituency || null,
    assigned_lok_sabha: user.assigned_lok_sabha || null,
    extra_constituencies: user.extra_constituencies || [],
    last_login_at: user.last_login_at || null,
    last_login_ip: user.last_login_ip || null,
    login_count: user.login_count || 0,
  };
};

const generateToken = (id) => {
  return jwt.sign({ user_id: id }, process.env.JWT_SECRET || 'blura-hub-secret-key-change-in-production', {
    expiresIn: '24h',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { password, full_name, role } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: buildEmailLookup(email) });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      full_name: String(full_name).trim(),
      role: role || 'level-1'
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body?.email);

    // Check for user email
    const user = await User.findOne({ email: buildEmailLookup(email) });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.is_active) {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      await createAuditLog(user, 'login', 'user', user.id, { ip: req.ip });

      // Audit trail: timestamp + IP + counter so the super admin can spot
      // stale accounts in the Constituency Logins console.
      user.last_login_at = new Date();
      user.last_login_ip = req.ip || req.headers['x-forwarded-for'] || null;
      user.login_count = (user.login_count || 0) + 1;
      try {
        await user.save();
      } catch (saveErr) {
        // Non-fatal: never block a login because we couldn't update audit fields.
        console.warn('[Auth] Failed to update login audit fields:', saveErr.message);
      }

      res.json({
        access_token: generateToken(user.id),
        token_type: 'bearer',
        user: buildUserPayload(user),
      });
    } else {
      // Optional: Log failed login attempts
      // await createAuditLog({ id: 'system', name: 'System' }, 'failed_login', 'user', null, { email, ip: req.ip });
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json(buildUserPayload(req.user));
};

// @desc    Super-admin only: create a constituency-scoped user (MLA / MP / NL).
// @route   POST /api/auth/provision-mla
// @access  Private (superadmin)
const provisionScopedUser = async (req, res) => {
  try {
    if (normalizeRole(req.user?.role) !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admins can provision scoped users' });
    }

    const {
      password,
      full_name,
      role = 'mla',
      assigned_constituency = null,
      assigned_lok_sabha = null,
      extra_constituencies = [],
    } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'email, password, full_name required' });
    }
    const normalizedRole = normalizeRole(role);
    if (!SCOPED_ROLES.has(normalizedRole)) {
      return res.status(400).json({ message: 'role must be mla, mp, or nara_lokesh' });
    }
    if ((normalizedRole === 'mla' || normalizedRole === 'nara_lokesh') && !assigned_constituency) {
      return res.status(400).json({ message: 'assigned_constituency required for this role' });
    }
    if (normalizedRole === 'mp' && !assigned_lok_sabha) {
      return res.status(400).json({ message: 'assigned_lok_sabha required for mp role' });
    }
    if (
      (normalizedRole === 'mla' || normalizedRole === 'nara_lokesh') &&
      !(await isValidConstituency(assigned_constituency))
    ) {
      return res.status(400).json({
        message: `Unknown constituency "${assigned_constituency}". It must match an official AP assembly constituency name.`,
        valid_constituencies: AP_MLAS.map((m) => m.constituency).sort(),
      });
    }
    if (normalizedRole === 'mp' && !isValidLokSabha(assigned_lok_sabha)) {
      return res.status(400).json({
        message: `Unknown Lok Sabha seat "${assigned_lok_sabha}". It must match an official AP Lok Sabha constituency.`,
        valid_lok_sabha_seats: Object.keys(LS_TO_AC).sort(),
      });
    }

    const exists = await User.findOne({ email: buildEmailLookup(email) });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password: hashed,
      full_name: String(full_name).trim(),
      role: normalizedRole,
      assigned_constituency,
      assigned_lok_sabha,
      extra_constituencies: Array.isArray(extra_constituencies) ? extra_constituencies : [],
    });

    return res.status(201).json(buildUserPayload(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Super-admin only: list all constituency-scoped users for the
//          provisioning UI. Returns one row per user with their assigned seat.
// @route   GET /api/auth/constituency-users
// @access  Private (superadmin)
const listScopedUsers = async (req, res) => {
  try {
    if (normalizeRole(req.user?.role) !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const users = await User.find({
      role: { $in: ['mla', 'mp', 'nara_lokesh'] },
    })
      .select('-password')
      .lean();
    return res.json({ users: users.map(buildUserPayload) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Super-admin only: reset password or toggle active for a scoped user.
// @route   PATCH /api/auth/scoped-user/:id
// @access  Private (superadmin)
const updateScopedUser = async (req, res) => {
  try {
    if (normalizeRole(req.user?.role) !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { id } = req.params;
    const { password, is_active, full_name, assigned_constituency, assigned_lok_sabha, extra_constituencies } = req.body || {};

    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!SCOPED_ROLES.has(normalizeRole(user.role))) {
      return res.status(400).json({ message: 'Only scoped users can be edited here' });
    }

    if (typeof full_name === 'string' && full_name.trim()) user.full_name = full_name.trim();
    if (typeof is_active === 'boolean') user.is_active = is_active;
    if (typeof assigned_constituency === 'string') {
      const trimmed = assigned_constituency.trim();
      if (trimmed && !(await isValidConstituency(trimmed))) {
        return res.status(400).json({
          message: `Unknown constituency "${assigned_constituency}". It must match an official AP assembly constituency name.`,
          valid_constituencies: AP_MLAS.map((m) => m.constituency).sort(),
        });
      }
      user.assigned_constituency = assigned_constituency;
    }
    if (typeof assigned_lok_sabha === 'string') {
      const trimmed = assigned_lok_sabha.trim();
      if (trimmed && !isValidLokSabha(trimmed)) {
        return res.status(400).json({
          message: `Unknown Lok Sabha seat "${assigned_lok_sabha}". It must match an official AP Lok Sabha constituency.`,
          valid_lok_sabha_seats: Object.keys(LS_TO_AC).sort(),
        });
      }
      user.assigned_lok_sabha = assigned_lok_sabha;
    }
    if (Array.isArray(extra_constituencies)) user.extra_constituencies = extra_constituencies;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    await user.save();
    return res.json(buildUserPayload(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  provisionScopedUser,
  listScopedUsers,
  updateScopedUser,
};
