/**
 * The one field trial the site can talk about.
 *
 * The host is named at the project owner's instruction. Everything user-facing
 * says "thực nghiệm tại" — where the trial took place — and never "đối tác",
 * "hợp tác cùng" or "được tin dùng bởi": hosting a visit is not an endorsement
 * and the copy must not imply one. Kept here so the name can be pulled in a
 * single edit if that permission is ever withdrawn; the hero and the trial
 * section both read from this file.
 */
export const TRIAL_HOST = "Công ty TNHH Nông nghiệp Công nghệ cao Dabaco";
export const TRIAL_HOST_SHORT = "Dabaco";
export const TRIAL_PROVINCE = { vi: "Bắc Ninh", en: "Bac Ninh" };
// The team competed as "Green Green" and renamed itself DIEPTEK; the owner asked
// for the new name on 2026-09-12. Kept as its own constant rather than reusing
// DEVELOPER so the trial copy can still name the people, not the company, if
// those ever diverge again.
export const TEAM_NAME = "DIEPTEK";

// Every photo from this trip lost its EXIF passing through a messaging app, so
// there is no verified capture date. Rather than invent one, the caption strip
// renders a date only once someone fills this in with a real one.
export const TRIAL_DATE: { vi: string; en: string } | null = null;
