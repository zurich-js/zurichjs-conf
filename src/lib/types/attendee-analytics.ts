/**
 * Attendee Analytics Types
 * Types for the attendee analytics dashboard in the admin panel
 */

export interface AttendeeAnalytics {
  /** High-level summary metrics */
  summary: AttendeeSummary;
  /** Breakdown by ticket category (standard, vip, student, unemployed) */
  byCategory: Record<string, { count: number }>;
  /** Breakdown by ticket stage (blind_bird, early_bird, general_admission, late_bird) */
  byStage: Record<string, { count: number }>;
  /** Attendee demographics: companies, job titles, geography */
  demographics: AttendeeDemographics;
  /** Acquisition channels: how attendees found/purchased tickets */
  acquisition: AttendeeAcquisition;
  /** AI-enriched company insights (null if ANTHROPIC_API_KEY not set) */
  companyInsights: AttendeeCompanyInsights | null;
}

export interface AttendeeCompanyInsights {
  /** Each enriched company with size/sector classification */
  companies: Array<{
    name: string;
    size: 'startup' | 'scaleup' | 'sme' | 'enterprise';
    sector: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  /** Attendee count by company size (weighted by attendees per company) */
  bySize: Record<string, number>;
  /** Attendee count by industry sector (weighted by attendees per company) */
  bySector: Array<{ sector: string; count: number }>;
  enrichedCount: number;
  totalCompanies: number;
}

export interface AttendeeSummary {
  totalAttendees: number;
  confirmedAttendees: number;
  checkedIn: number;
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

export interface AttendeeAcquisition {
  /** Individual vs B2B vs complimentary breakdown */
  byChannel: {
    individual: number;
    b2b: number;
    complimentary: number;
  };
  /** Attendees who used a coupon or partnership code */
  withCoupon: number;
  /** Attendees from partnerships */
  fromPartnerships: number;
  /** Top coupon codes used */
  topCoupons: Array<{ code: string; count: number }>;
  /** Top partnership sources */
  topPartnerships: Array<{ partnershipId: string; count: number }>;
  /** Tickets sold this week / this month / total */
  velocity: {
    thisWeek: number;
    thisMonth: number;
    avgPerWeek: number;
  };
}
