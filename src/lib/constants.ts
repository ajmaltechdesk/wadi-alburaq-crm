import type { ClientStatus, Priority } from "./types";

export const COMPANY_NAME = "WADI AL BURAQ TOURISM L.L.C.";

export const SERVICE_TYPES = [
  "Visit Visa",
  "Tourist Visa",
  "Employment Visa",
  "Family Visa",
  "Spouse Visa",
  "Golden Visa",
  "Freelance Visa",
  "Visa Renewal",
  "Visa Extension",
  "Airport to Airport Visa Change",
  "Inside Country Visa Change",
  "UAE Visa",
  "Schengen & Europe Visa",
  "Saudi Multi Entry Visa",
  "Malaysia E Visa",
  "Thailand E Visa",
  "Serbia Work Permit & Visa",
  "Air Ticket Booking",
  "Hotel Booking",
  "Holiday Packages",
  "Umrah / Travel Package",
  "Travel Insurance",
  "Document Attestation",
  "Other",
];

export const LEAD_SOURCES = [
  "Walk-In",
  "Phone",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Google",
  "Website",
  "Referral",
  "Other",
];

export const CLIENT_STATUSES: ClientStatus[] = [
  "New",
  "Contacted",
  "Documents Pending",
  "Processing",
  "Payment Pending",
  "Submitted",
  "Approved",
  "Rejected",
  "Completed",
  "Closed",
];

export const KANBAN_STATUSES: ClientStatus[] = [
  "New",
  "Contacted",
  "Documents Pending",
  "Processing",
  "Completed",
];

export const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

export const DOCUMENT_TYPES = [
  "Passport",
  "Visa",
  "Emirates ID",
  "Photo",
  "Insurance",
  "Flight Ticket",
  "Quotation",
  "Invoice",
  "Other",
] as const;

export const FOLLOWUP_MODES = ["Call", "WhatsApp", "Email", "Meeting", "Reminder"] as const;

export const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Cheque", "Online Payment", "Other"];

export const STATUS_COLORS: Record<ClientStatus, string> = {
  New: "info",
  Contacted: "info",
  "Documents Pending": "warning",
  Processing: "primary",
  "Payment Pending": "warning",
  Submitted: "primary",
  Approved: "success",
  Rejected: "danger",
  Completed: "success",
  Closed: "muted",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  High: "danger",
  Medium: "warning",
  Low: "muted",
};

export const NATIONALITIES = [
  "Emirati", "Indian", "Pakistani", "Bangladeshi", "Sri Lankan", "Nepali", "Filipino",
  "Egyptian", "Jordanian", "Lebanese", "Syrian", "Palestinian", "Sudanese", "Moroccan",
  "Tunisian", "Algerian", "Saudi", "Omani", "Qatari", "Kuwaiti", "Bahraini", "Yemeni",
  "Iraqi", "Iranian", "Afghan", "Chinese", "Indonesian", "Malaysian", "Thai", "Vietnamese",
  "Nigerian", "Kenyan", "Ethiopian", "Ugandan", "Ghanaian", "South African", "British",
  "American", "Canadian", "Australian", "French", "German", "Italian", "Spanish", "Russian",
  "Ukrainian", "Turkish", "Uzbek", "Kazakh", "Kyrgyz", "Tajik", "Azerbaijani", "Georgian",
  "Armenian", "Serbian", "Romanian", "Other",
];

export const COUNTRIES = [
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain",
  "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Philippines", "Indonesia",
  "Malaysia", "Thailand", "Singapore", "China", "Japan", "South Korea", "Vietnam",
  "Egypt", "Jordan", "Lebanon", "Turkey", "Morocco", "Tunisia", "Nigeria", "Kenya",
  "Ethiopia", "South Africa", "United Kingdom", "France", "Germany", "Italy", "Spain",
  "Netherlands", "Switzerland", "Austria", "Greece", "Portugal", "Czech Republic",
  "Poland", "Hungary", "Serbia", "Romania", "Russia", "Ukraine", "Azerbaijan", "Georgia",
  "Armenia", "Uzbekistan", "Kazakhstan", "United States", "Canada", "Australia",
  "New Zealand", "Brazil", "Other",
];

export const LANGUAGES = ["English", "Arabic", "Hindi", "Urdu", "Malayalam", "Tamil", "Bengali", "Tagalog", "Russian", "French", "Other"];

export const DEPARTMENTS = ["Sales", "Visa Processing", "Ticketing", "Holidays", "Operations", "Accounts", "Management"];

export const AED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});
