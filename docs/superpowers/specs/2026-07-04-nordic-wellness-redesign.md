# MediCareAI-Agent Frontend Redesign — Nordic Wellness

**Date:** 2026-07-04
**Status:** Approved

## Overview

Complete visual redesign of the MediCareAI-Agent frontend. Shift from warm orange/brown "Mediterranean" aesthetic to a "Nordic Wellness" design language using sage green (patient) and steel indigo (doctor). All UI text translated from Chinese to English.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Design direction | Nordic Wellness |
| Patient primary | Sage green `#7D9B76` |
| Doctor primary | Steel Indigo `#4A5568` |
| Button style | Squircle `border-radius: 18px` |
| Font | Plus Jakarta Sans + PingFang SC fallback |
| Language | English |

## Color Palette

### Patient Theme

| Token | Value | Usage |
|-------|-------|-------|
| `primary.main` | `#7D9B76` | Buttons, links, icons, accents |
| `primary.light` | `#A3B899` | Hover backgrounds |
| `primary.dark` | `#5C7A55` | Button hover states |
| `primary.contrastText` | `#FFFFFF` | Text on primary |
| `secondary.main` | `#9B8E7E` | Secondary text, captions |
| `secondary.light` | `#C4B9A8` | |
| `secondary.dark` | `#6B5E4E` | |
| `background.default` | `#F8F5F0` | Page backgrounds |
| `background.paper` | `#FFFFFF` | Card/surface backgrounds |
| `text.primary` | `#2C3E2D` | Body text |
| `text.secondary` | `#6B7D6B` | Subtitle text |
| `divider` | `#D9D6CE` | Borders, dividers |
| `error.main` | `#D32F2F` | Error states |
| `warning.main` | `#F57C00` | Warning states |
| `success.main` | `#388E3C` | Success states |
| `info.main` | `#5B8C89` | Info states |

### Doctor Theme

| Token | Value | Usage |
|-------|-------|-------|
| `primary.main` | `#4A5568` | Buttons, links, icons |
| `primary.light` | `#7B8DAA` | Hover backgrounds |
| `primary.dark` | `#2D3748` | Button hover states |
| `primary.contrastText` | `#FFFFFF` | Text on primary |
| `secondary.main` | `#718096` | Secondary text |
| `secondary.light` | `#A0AEC0` | |
| `secondary.dark` | `#4A5568` | |
| `background.default` | `#EDF0F4` | Page backgrounds |
| `background.paper` | `#FFFFFF` | Card backgrounds |
| `text.primary` | `#1A202C` | Body text |
| `text.secondary` | `#718096` | Subtitle text |
| `divider` | `#CBD5E0` | Borders, dividers |
| `error.main` | `#C53030` | Error states |
| `warning.main` | `#C05621` | Warning states |
| `success.main` | `#2F855A` | Success states |
| `info.main` | `#2B6CB0` | Info states |

## Component Specifications

### Buttons
- `borderRadius: 18px` (squircle)
- `textTransform: none`
- `fontWeight: 600`
- Contained: primary color background, white text
- Outlined: transparent, primary border

### Cards
- `borderRadius: 18px`
- `boxShadow: 0 2px 12px rgba(0,0,0,0.06)`
- Paper background

### Input Fields
- `borderRadius: 12px`
- Slightly smaller than buttons/cards for visual distinction
- Border color: theme divider color

### Chips
- `borderRadius: 10px`
- `fontWeight: 500`

### Typography
- Font family: `"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", sans-serif`
- h6: 600 weight, 1.1rem
- body1: 0.9375rem, line-height 1.6
- body2: 0.875rem, line-height 1.6
- caption: 0.75rem

### Shadows
- Card: `0 2px 12px rgba(0,0,0,0.06)`
- Card hover: `0 4px 20px rgba(0,0,0,0.08)`
- AppBar: `0 1px 3px rgba(0,0,0,0.06)`

## Language Change

All UI text translated from Chinese to English:
- Page titles, button labels, form fields
- Navigation items, sidebar menus
- Status messages, error text
- Placeholder text, helper text
- Chat messages, interview questions

## Implementation Approach

1. Rewrite both MUI theme files (theme.ts, themes/doctorTheme.ts)
2. Replace all hardcoded color constants across components
3. Update `index.css` — remove legacy CSS variables, set new font
4. Translate all UI text strings to English
5. Update component-level sx overrides for new border-radius values
6. Rebuild and verify

## Out of Scope

- Backend code changes
- Functional/behavioral changes
- API schema changes
- New features
- Mobile app (Android)
