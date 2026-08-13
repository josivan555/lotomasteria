# Mobile Optimization Plan

Adjust all main screens and components to be fully responsive and optimized for mobile devices, ensuring a seamless experience on smaller viewports.

## Proposed Changes

### Global Styles & Layout
- Review `src/routes/__root.tsx` for main container padding and mobile navigation.
- Ensure `src/styles.css` has appropriate base font sizes and spacing for mobile.

### Landing Page (`src/routes/index.tsx`)
- Adjust Hero section: Stack elements vertically on mobile, resize text.
- Optimize Bolões grid: Change from multi-column to single or two-column layout on small screens.
- Fix horizontal scrolling issues.

### Bolão Detail & Checkout (`src/routes/boloes.$bolaoId.tsx`)
- Stack the summary and purchase form vertically.
- Ensure inputs and buttons have enough touch target size (minimum 44px).
- Refine the participants table/list for mobile (horizontal scroll or card-based view).

### Payment Page (`src/routes/boloes.pagamento.$codigo.tsx`)
- Optimize QR code display: ensure it fits within the viewport.
- Center and stack payment details for better readability.

### Admin Dashboard (`src/routes/_authenticated/admin/index.tsx`)
- Convert tables to scrollable containers or card-based layouts for mobile.
- Adjust tabs and filters to be more compact or scrollable.

### Components
- `src/components/Navbar.tsx`: Ensure mobile menu is functional and aesthetic.
- `src/components/Footer.tsx`: Adjust column stacking.

## Technical Details
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) to apply mobile-first styles.
- Implement `overflow-x-auto` for tables to prevent layout breaking.
- Use `flex-col md:flex-row` patterns for side-by-side elements that should stack.
- Adjust padding/margins: `p-4 md:p-8`.
- Ensure `viewport` meta tag is correctly set in `__root.tsx`.
