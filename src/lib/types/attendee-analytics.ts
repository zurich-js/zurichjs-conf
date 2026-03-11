/**
 * Attendee Analytics Types
 * Types for the attendee analytics dashboard in the admin panel
 */

export interface AttendeeAnalytics {
  /** High-level summary metrics */
  summary: AttendeeSummary;
  /** Breakdown by ticket category (standard, vip, student, unemployed) */
  byCategory: Record<string, { count: number; revenue: number }>;
  /** Breakdown by ticket stage (blind_bird, early_bird, general_admission, late_bird) */
  byStage: Record<string, { count: number; revenue: number }>;
  /** Attendee demographics: companies, job titles, geography */
  demographics: AttendeeDemographics;
  /** Registration timeline (cumulative over time) */
  registrationTimeline: AttendeeTimelineEntry[];
}

export interface AttendeeSummary {
  totalAttendees: number;
  confirmedAttendees: number;
  checkedIn: number;
  totalRevenue: number;
  avgTicketPrice: number;
  companiesRepresented: number;
  countriesRepresented: number;
}

export interface AttendeeDemographics {
  /** Top companies by attendee count */
  topCompanies: Array<{ company: string; count: number }>;
  /** Top job titles / roles */
  topJobTitles: Array<{ jobTitle: string; count: number }>;
  /** Top countries by attendee count */
  topCountries: Array<{ country: string; count: number }>;
  /** Top cities by attendee count */
  topCities: Array<{ city: string; count: number }>;
  /** Attendees with company info vs without */
  companyProvided: number;
  companyMissing: number;
  /** Attendees with job title info vs without */
  jobTitleProvided: number;
  jobTitleMissing: number;
}

export interface AttendeeTimelineEntry {
  date: string;
  count: number;
  cumulative: number;
  revenue: number;
  cumulativeRevenue: number;
}
