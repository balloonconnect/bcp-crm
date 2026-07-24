/**
 * The 8 team "types" named in the brief map onto two things that
 * already exist rather than a new classification: `StudioUser.
 * employmentType` (Employee/Freelancer — literally those two words),
 * and the functional `StudioRoleKey`s `@bcp/permissions` has defined
 * since the auth phase (Photographer, Videographer, Editor,
 * Salesperson→`sales`, Accountant all already exist as roles;
 * Designer→`album_designer`). This registry exists so the team UI can
 * label those existing role keys with the brief's exact wording rather
 * than introducing a second, parallel "team type" concept that would
 * drift from the real RBAC roles doing the actual permission work.
 */
export const TEAM_TYPE_TO_ROLE_KEY: Record<string, string> = {
  Photographer: "photographer",
  Videographer: "videographer",
  Editor: "editor",
  Designer: "album_designer",
  Salesperson: "sales",
  Accountant: "accountant",
};

export const FUNCTIONAL_TEAM_TYPES = Object.keys(TEAM_TYPE_TO_ROLE_KEY);

export type EmploymentType = "employee" | "freelancer";
export const EMPLOYMENT_TYPES: EmploymentType[] = ["employee", "freelancer"];
