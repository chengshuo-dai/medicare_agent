/** Reusable sx style fragments — Nordic Wellness design system
 *
 * Usage: import { flexRow, pageContainer } from '../../styles/sxUtils'
 */

// ============================================================================
// Flex Layout
// ============================================================================

export const flexRow = {
  display: 'flex' as const,
  alignItems: 'center' as const,
};

export const flexRowBetween = {
  ...flexRow,
  justifyContent: 'space-between' as const,
};

export const flexRowCenter = {
  ...flexRow,
  justifyContent: 'center' as const,
};

export const flexColumn = {
  display: 'flex' as const,
  flexDirection: 'column' as const,
};

// ============================================================================
// Common combos
// ============================================================================

export const flexRowBetweenMb2 = { ...flexRowBetween, mb: 2 };
export const flexRowGap1 = { ...flexRow, gap: 1 };
export const flexRowGap1Mb05 = { ...flexRow, gap: 1, mb: 0.5 };
export const flexRowGap15 = { ...flexRow, gap: 1.5 };
export const flexRowGap2 = { ...flexRow, gap: 2 };
export const flexRowGap05 = { ...flexRow, gap: 0.5 };
export const flexRowGap1Mb1 = { ...flexRow, gap: 1, mb: 1 };
export const flexRowGap05Mb05 = { ...flexRow, gap: 0.5, mb: 0.5 };

// ============================================================================
// Page / Container
// ============================================================================

export const pageContainer = {
  minHeight: '100vh' as const,
  display: 'flex' as const,
  flexDirection: 'column' as const,
};

export const pageCenter = {
  minHeight: '100vh' as const,
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

export const pageHeader = {
  pt: 3,
  pb: 2,
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 1,
};

// ============================================================================
// Card / Component
// ============================================================================

export const cardStyle = {
  borderRadius: 3,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)' as const,
};

export const cardStyleSm = {
  borderRadius: 2,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)' as const,
};

export const iconBox = (size: number = 48) => ({
  width: size,
  height: size,
  borderRadius: 2,
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

export const searchBox = { ...flexRow, gap: 1, mb: 2 };
