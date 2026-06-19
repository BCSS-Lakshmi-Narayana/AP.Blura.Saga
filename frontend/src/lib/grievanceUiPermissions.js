export const GRIEVANCE_ADMIN_EMAIL = 'sreenu@gmail.com';

export const canManageRestrictedGrievanceUi = (user) => {
  const email = String(user?.email || '').trim().toLowerCase();
  return email === GRIEVANCE_ADMIN_EMAIL;
};
