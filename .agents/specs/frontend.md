# Frontend verification

Use for visual, responsive, interaction, or accessibility changes.

1. Run the generated OpenNext Worker or the closest available real entrypoint.
2. Inspect the affected flow in a browser at phone and desktop widths, light and dark themes, and the
   applicable anonymous/owner state.
3. Check keyboard navigation, visible focus, reduced motion, overflow, loading, empty, and error states.
4. Confirm the browser console has no unexpected error or warning.
5. Capture stable screenshots of the changed surface and run the relevant Playwright/accessibility
   checks.

Code inspection alone is not completion evidence. If the real entrypoint cannot run, report that limit
instead of claiming visual verification.
