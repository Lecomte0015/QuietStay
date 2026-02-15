// ============================================================
// QuietStay Ops — Types
// ============================================================

export type UserRole = 'admin' | 'staff' | 'owner';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  iban: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  properties_count?: number;
  total_revenue?: number;
}

export type PropertyType = 'apartment' | 'house' | 'studio' | 'chalet' | 'villa';
export type PropertyStatus = 'active' | 'inactive' | 'maintenance';

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  canton: string;
  postal_code: string | null;
  property_type: PropertyType;
  bedrooms: number;
  max_guests: number;
  status: PropertyStatus;
  notes: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Owner;
  accesses?: Access[];
  bookings_count?: number;
}

export type Platform = 'airbnb' | 'booking' | 'direct' | 'other';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

export interface Booking {
  id: string;
  property_id: string;
  platform: Platform;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  guest_count: number;
  total_amount: number | null;
  commission_rate: number;
  status: BookingStatus;
  notes: string | null;
  ical_uid: string | null;
  is_conflict: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  property?: Property;
  cleaning?: Cleaning;
}

export type CleaningStatus = 'pending' | 'in_progress' | 'done' | 'validated' | 'issue';
export type CleaningType = 'checkout' | 'checkin' | 'deep' | 'maintenance';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface Cleaning {
  id: string;
  booking_id: string | null;
  property_id: string;
  assigned_to: string | null;
  scheduled_date: string;
  status: CleaningStatus;
  type: CleaningType;
  checklist: ChecklistItem[];
  notes: string | null;
  cost: number | null;
  photos: string[];
  validated_at: string | null;
  validated_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  property?: Property;
  booking?: Booking;
  assignee?: Profile;
}

export type AccessType = 'code' | 'key' | 'lockbox' | 'smartlock';

export interface Access {
  id: string;
  property_id: string;
  type: AccessType;
  label: string;
  value: string;
  instructions: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface Invoice {
  id: string;
  owner_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  commission_amount: number;
  cleaning_costs: number;
  other_costs: number;
  net_amount: number;
  status: InvoiceStatus;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Owner;
}

export interface TodayMovement {
  booking_id: string;
  guest_name: string;
  guest_phone: string | null;
  property_name: string;
  address: string;
  check_in: string;
  check_out: string;
  movement_type: 'arrival' | 'departure';
  booking_status: BookingStatus;
  access_type: AccessType | null;
  access_value: string | null;
  access_instructions: string | null;
}

// ─── iCal Sync ──────────────────────────────────────────────
export type CalendarPlatform = 'airbnb' | 'booking';
export type SyncStatus = 'success' | 'error' | 'pending';

export interface CalendarSource {
  id: string;
  property_id: string;
  platform: CalendarPlatform;
  ical_url: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_status: SyncStatus | null;
  last_sync_message: string | null;
  events_synced: number;
  auto_sync: boolean;
  sync_interval_hours: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncIcalResponse {
  success: boolean;
  message: string;
  events_found?: number;
  bookings_created?: number;
  bookings_updated?: number;
  bookings_cancelled?: number;
  errors?: string[];
}

// Dashboard KPIs
export interface DashboardKPIs {
  total_properties: number;
  active_bookings: number;
  pending_cleanings: number;
  monthly_revenue: number;
  occupancy_rate: number;
  arrivals_today: number;
  departures_today: number;
  conflicts_count: number;
}

// ─── Owner Reports ──────────────────────────────────────────
export interface PropertyReport {
  property_id: string;
  property_name: string;
  property_type: string;
  city: string;
  canton: string;
  bedrooms: number;
  max_guests: number;
  bookings_count: number;
  nights_booked: number;
  revenue: number;
  cleanings_count: number;
  occupancy_rate: number;
}

export interface ReportSummary {
  total_properties: number;
  total_bookings: number;
  total_nights: number;
  total_revenue: number;
  total_cleanings: number;
  period: string;
  period_start: string;
  period_end: string;
}

export interface ReportData {
  properties: PropertyReport[];
  summary: ReportSummary;
}

export interface Report {
  id: string;
  owner_id: string;
  period: string;
  data: ReportData;
  generated_at: string;
  owner?: Owner;
}

// ─── WhatsApp Notifications ──────────────────────────────────
export type NotificationEventType =
  | 'overbooking'
  | 'booking_created'
  | 'booking_cancelled'
  | 'cleaning_not_validated'
  | 'incident_reported'
  | 'checkin_no_cleaning';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface NotificationSettings {
  id: string;
  user_id: string;
  whatsapp_phone: string | null;
  event_overbooking: boolean;
  event_booking_created: boolean;
  event_booking_cancelled: boolean;
  event_cleaning_not_validated: boolean;
  event_incident_reported: boolean;
  event_checkin_no_cleaning: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  event_type: NotificationEventType;
  message: string;
  whatsapp_phone: string;
  status: NotificationStatus;
  error_message: string | null;
  meta_message_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

// ─── Profitability ──────────────────────────────────────────
export type ProfitabilityBadge = 'rentable' | 'a_optimiser' | 'deficitaire';

export interface PropertyProfitability {
  property_id: string;
  property_name: string;
  property_type: string;
  city: string;
  canton: string;
  owner_name: string;
  bookings_count: number;
  nights_booked: number;
  days_in_month: number;
  occupancy_rate: number;
  gross_revenue: number;
  commission_amount: number;
  cleaning_costs: number;
  net_profit: number;
}

// ─── Analytics ─────────────────────────────────────────────
export interface AnalyticsRow {
  month: number;
  property_id: string;
  property_name: string;
  city: string;
  platform: string;
  bookings_count: number;
  nights_booked: number;
  days_in_month: number;
  occupancy_rate: number;
  gross_revenue: number;
  cleaning_costs: number;
  net_revenue: number;
}

export interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[];
  occupancyByMonth: { month: string; rate: number }[];
  revenueByProperty: { name: string; revenue: number }[];
  revenueByPlatform: { name: string; value: number }[];
  bookingsByMonth: { month: string; count: number }[];
  totalRevenue: number;
  totalBookings: number;
  avgOccupancy: number;
}

// ─── Guidebooks ──────────────────────────────────────────────
export interface Guidebook {
  id: string;
  property_id: string;
  is_published: boolean;
  welcome_message: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  check_in_time: string;
  check_out_time: string;
  access_instructions: string | null;
  house_rules: string | null;
  parking_info: string | null;
  transport_info: string | null;
  restaurants: string | null;
  activities: string | null;
  emergency_contacts: string | null;
  custom_sections: { title: string; content: string }[];
  created_at: string;
  updated_at: string;
}

// ─── Contracts ───────────────────────────────────────────────
export type ContractStatus = 'draft' | 'sent' | 'signed';

export interface Contract {
  id: string;
  booking_id: string;
  property_id: string;
  owner_id: string;
  guest_name: string;
  guest_address: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  deposit_amount: number;
  status: ContractStatus;
  signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  property?: Property;
  owner?: Owner;
  booking?: Booking;
}

// ─── Company Settings ────────────────────────────────────────
export interface CompanySettings {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  canton: string;
  phone: string | null;
  email: string | null;
  iban: string | null;
  tva_number: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}
