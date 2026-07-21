"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { ClientDraft } from "./data";
import type { Client, ClientStatus, Priority, UserProfile } from "./types";
import { CLIENT_STATUSES, LEAD_SOURCES, PRIORITIES } from "./constants";

/** Template column definitions — the header text is the contract for parsing. */
const COLUMNS: { header: string; example: string }[] = [
  { header: "Client Name", example: "Ahmed Khan" },
  { header: "Mobile Number", example: "+971501234567" },
  { header: "WhatsApp Number", example: "+971501234567" },
  { header: "Email", example: "ahmed@email.com" },
  { header: "Gender", example: "Male" },
  { header: "Date of Birth", example: "1990-05-20" },
  { header: "Nationality", example: "Indian" },
  { header: "Country of Residence", example: "United Arab Emirates" },
  { header: "Passport Number", example: "N1234567" },
  { header: "Passport Expiry", example: "2030-01-15" },
  { header: "Visa Status", example: "Visit visa expiring soon" },
  { header: "Current Location", example: "Dubai" },
  { header: "Preferred Language", example: "English" },
  { header: "Lead Source", example: "Walk-In" },
  { header: "Priority", example: "Medium" },
  { header: "Status", example: "New" },
  { header: "Assigned Employee Email", example: "sales1@wadialburaq.com" },
  { header: "Remarks", example: "Walk-in enquiry for tourist visa" },
];

/** Build and download the .xlsx template with an example row + instructions. */
export function downloadClientTemplate() {
  const headers = COLUMNS.map((c) => c.header);
  const example = COLUMNS.map((c) => c.example);
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(16, h.length + 2) }));

  const instructions = [
    ["Wadi Al Buraq — Client Import Template"],
    [""],
    ["How to use:"],
    ["1. Fill one client per row on the 'Clients' sheet (row 2 is an example — replace or delete it)."],
    ["2. 'Client Name' and 'Mobile Number' are REQUIRED. All other columns are optional."],
    ["3. Dates must be in YYYY-MM-DD format (e.g. 1990-05-20)."],
    ["4. 'Assigned Employee Email' must match a user's email in the system. Leave blank to assign to yourself (the admin)."],
    ["5. Rows whose Mobile Number already exists in the system are skipped as duplicates."],
    [""],
    ["Allowed values:"],
    ["Gender", "Male, Female, Other"],
    ["Priority", PRIORITIES.join(", ")],
    ["Status", CLIENT_STATUSES.join(", ")],
    ["Lead Source", LEAD_SOURCES.join(", ")],
    [""],
    ["Any unrecognized Lead Source / Priority / Status falls back to a sensible default (Other / Medium / New)."],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
  wsInfo["!cols"] = [{ wch: 22 }, { wch: 80 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.utils.book_append_sheet(wb, wsInfo, "Instructions");
  XLSX.writeFile(wb, "wadi-clients-import-template.xlsx");
}

export interface ImportResult {
  drafts: ClientDraft[];
  errors: { row: number; reason: string }[];
  duplicates: number;
  totalRows: number;
}

const cleanPhone = (v: string) => v.replace(/[\s\-()]/g, "");

function toDateStr(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return format(v, "yyyy-MM-dd");
  const s = String(v).trim();
  return s || undefined;
}

function normalize<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  const hit = allowed.find((a) => a.toLowerCase() === value.trim().toLowerCase());
  return hit ?? fallback;
}

/**
 * Parse an uploaded .xlsx/.csv into validated client drafts.
 * Resolves "Assigned Employee Email" to a uid, defaulting to the admin.
 */
export async function parseClientFile(
  file: File,
  users: UserProfile[],
  existingClients: Pick<Client, "mobile">[],
  admin: UserProfile
): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets["Clients"] ?? wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const existingMobiles = new Set(existingClients.map((c) => cleanPhone(c.mobile || "")));
  const seenMobiles = new Set<string>();

  const drafts: ClientDraft[] = [];
  const errors: { row: number; reason: string }[] = [];
  let duplicates = 0;

  rows.forEach((r, idx) => {
    const rowNum = idx + 2; // header is row 1
    const get = (h: string) => String(r[h] ?? "").trim();

    const name = get("Client Name");
    const mobile = get("Mobile Number");

    // Skip completely blank rows silently
    if (!name && !mobile && COLUMNS.every((c) => !get(c.header))) return;

    if (!name) { errors.push({ row: rowNum, reason: "Missing Client Name" }); return; }
    if (!mobile) { errors.push({ row: rowNum, reason: "Missing Mobile Number" }); return; }

    // Resolve assigned employee
    const email = get("Assigned Employee Email").toLowerCase();
    let assignee = admin;
    if (email) {
      const found = byEmail.get(email);
      if (!found) {
        errors.push({ row: rowNum, reason: `Unknown employee email "${email}"` });
        return;
      }
      assignee = found;
    }

    // Duplicate detection (against DB and within the file)
    const key = cleanPhone(mobile);
    if (existingMobiles.has(key) || seenMobiles.has(key)) { duplicates++; return; }
    seenMobiles.add(key);

    const genderRaw = get("Gender");
    const gender = ["Male", "Female", "Other"].find((g) => g.toLowerCase() === genderRaw.toLowerCase()) as
      | Client["gender"]
      | undefined;

    drafts.push({
      name,
      mobile,
      whatsapp: get("WhatsApp Number") || undefined,
      email: get("Email") || undefined,
      gender,
      dateOfBirth: toDateStr(r["Date of Birth"]),
      nationality: get("Nationality") || undefined,
      countryOfResidence: get("Country of Residence") || undefined,
      passportNumber: get("Passport Number").toUpperCase() || undefined,
      passportExpiry: toDateStr(r["Passport Expiry"]),
      visaStatus: get("Visa Status") || undefined,
      currentLocation: get("Current Location") || undefined,
      preferredLanguage: get("Preferred Language") || undefined,
      leadSource: normalize(get("Lead Source"), LEAD_SOURCES as string[], "Other"),
      priority: normalize<Priority>(get("Priority"), PRIORITIES, "Medium"),
      status: normalize<ClientStatus>(get("Status"), CLIENT_STATUSES, "New"),
      remarks: get("Remarks") || undefined,
      assignedEmployeeId: assignee.uid,
      assignedEmployeeName: assignee.name,
      assignedBy: admin.name,
      createdBy: admin.uid,
    });
  });

  return { drafts, errors, duplicates, totalRows: rows.length };
}
