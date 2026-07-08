/** Generic page header component
 * Replaces duplicated title-row layouts across pages.
 * Supports icon, subtitle, action buttons, badges, and other combinations.
 */

import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { flexRowBetweenMb2 } from '../../styles/sxUtils';

interface PageHeaderProps {
  title: string;
  /** Right-side action area (buttons, chips, etc.) */
  actions?: ReactNode;
  /** Icon before the title */
  icon?: ReactNode;
  /** Additional element after the title (e.g., badge) */
  titleSuffix?: ReactNode;
  /** Supplementary description text (displayed next to the title) */
  subtitle?: string;
}

export function PageHeader({ title, actions, icon, titleSuffix, subtitle }: PageHeaderProps) {
  return (
    <Box sx={flexRowBetweenMb2}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {icon}
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {titleSuffix}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions}
    </Box>
  );
}
