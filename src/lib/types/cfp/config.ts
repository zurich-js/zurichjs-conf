/**
 * CFP Config Types
 * Configuration types for CFP system
 */

/**
 * CFP configuration entry
 */
export interface CfpConfig {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

/**
 * CFP status configuration
 */
export interface CfpStatusConfig {
  enabled: boolean;
  open_date: string | null;
  close_date: string | null;
}
