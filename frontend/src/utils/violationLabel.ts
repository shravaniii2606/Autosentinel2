/**
 * Returns the user-facing name for a stored violation type without changing
 * the value used by API calls, filtering, or scoring.
 */
export function formatViolationType(violationType: string): string {
  return violationType === 'UNVERIFIED_ZONE'
    ? 'Mixed Use Development'
    : violationType
}
