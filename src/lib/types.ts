import type { Timestamp } from "firebase/firestore";

export type Role = "admin" | "manager" | "employee";

export interface UserProfile {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  department?: string;
  designation?: string;
  managerId?: string;
  status: "active" | "inactive";
  monthlyTarget?: number;
  photoURL?: string;
  createdAt: Timestamp;
}

export type Priority = "High" | "Medium" | "Low";

export type ClientStatus =
  | "New"
  | "Contacted"
  | "Documents Pending"
  | "Processing"
  | "Payment Pending"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Completed"
  | "Closed";

export interface Client {
  id: string;
  clientCode: string; // WB-2026-0001
  name: string;
  nameLower: string;
  gender?: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  nationality?: string;
  countryOfResidence?: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  passportNumber?: string;
  passportExpiry?: string;
  visaStatus?: string;
  currentLocation?: string;
  preferredLanguage?: string;
  leadSource: string;
  priority: Priority;
  status: ClientStatus;
  remarks?: string;
  assignedEmployeeId: string;
  assignedEmployeeName?: string;
  assignedDate?: Timestamp;
  assignedBy?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Requirement {
  id: string;
  clientId: string;
  assignedEmployeeId: string;
  serviceType: string;
  destinationCountry?: string;
  travelDate?: string;
  returnDate?: string;
  travellers?: number;
  budget?: number;
  details?: string;
  expectedClosingDate?: string;
  priority: Priority;
  status: "Open" | "In Progress" | "Won" | "Lost" | "On Hold";
  employeeNotes?: string;
  internalNotes?: string;
  createdAt: Timestamp;
}

export type DocumentType =
  | "Passport"
  | "Visa"
  | "Emirates ID"
  | "Photo"
  | "Insurance"
  | "Flight Ticket"
  | "Quotation"
  | "Invoice"
  | "Other";

export interface ClientDocument {
  id: string;
  clientId: string;
  assignedEmployeeId: string;
  type: DocumentType;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  downloadURL: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: Timestamp;
}

export type FollowUpMode = "Call" | "WhatsApp" | "Email" | "Meeting" | "Reminder";

export interface FollowUp {
  id: string;
  clientId: string;
  clientName?: string;
  assignedEmployeeId: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  mode: FollowUpMode;
  notes?: string;
  outcome?: string;
  nextFollowUpDate?: string;
  status: "Pending" | "Done" | "Missed" | "Cancelled";
  createdAt: Timestamp;
}

export interface TaskItem {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  assignedTo: string;
  assignedToName?: string;
  createdBy: string;
  clientId?: string;
  priority: Priority;
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  recurring?: "None" | "Daily" | "Weekly" | "Monthly";
  createdAt: Timestamp;
}

export type PaymentStatus = "Pending" | "Partial" | "Paid" | "Refunded";

export interface Sale {
  id: string;
  clientId: string;
  clientName?: string;
  assignedEmployeeId: string;
  employeeName?: string;
  serviceType: string;
  quotationAmount?: number;
  invoiceAmount: number;
  advancePayment: number;
  balance: number;
  revenue: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  invoiceNumber?: string;
  saleDate: string;
  createdAt: Timestamp;
}

export type NotificationType =
  | "client_assigned"
  | "followup_today"
  | "documents_missing"
  | "visa_expiring"
  | "passport_expiring"
  | "task_due"
  | "payment_pending"
  | "client_updated"
  | "reminder";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  entity: string;
  entityId?: string;
  previousValue?: string;
  updatedValue?: string;
  createdAt: Timestamp;
}

export interface AppSettings {
  services: string[];
  countries: string[];
  leadSources: string[];
  departments: string[];
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  emailTemplates?: Record<string, string>;
  whatsappTemplates?: Record<string, string>;
}
