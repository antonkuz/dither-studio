# Mobile Reconciliation Plan

## Context

Reconcile the mobile design mockup with the current codebase. Where terminology or functionality differs, the **current code wins** (it's newer). The design informs **layout, spacing, and mobile UX patterns**.

## Design vs Current Code — Key Differences

| Aspect | Design Mockup | Current Code | Resolution |
|---|---|---|---|
| Title | "Dither Studio" | "DITHER.JS DEMO" | **Keep current** |
| Theme | Light (white bg) | Dark (#1a1a2e) | **Keep current** |
| Slider: "Roughness" | 1–10, labeled "Roughness" | 1–10, labeled "Step" | **Keep "Step"** |
| Slider: Brightness | Shown as 100% | Range -10 to 10 | **Keep current range** |
| Colors | Purple, blue, green, yellow, pink, magenta, gray | White, red, orange, yellow, cyan, blue, magenta | **Keep current colors** |
| Custom color picker | Has one (hex input + swatch) | None | **Add** (new feature from design) |
| "Example Image" button | Present in drop zone | Loads fishka.jpeg on startup silently | **Add button** (make explicit) |
| Drop zone layout | Buttons stacked inside drop zone | Buttons in separate controls bar below | **Adopt design pattern for mobile** |
| "Apply Dither" button | Not shown | Present | **Keep** (move to settings section) |
| "Copy Params" button | Not shown | Present | **Keep** (move to settings section) |
| Settings card | "Dither Settings" card with rounded border | Inline controls bar | **Adopt card pattern for mobile** |
| Mobile responsiveness | Fully mobile-optimized | No media queries at all | **Add media queries** |

## Implementation Steps

### 1. Restructure HTML for mobile-friendly layout

Reorganize the HTML to group controls into logical sections that stack well on mobile:

- **Drop zone section**: Keep drop zone. On mobile, move "Choose File", "Use Webcam", and new "Example Image" buttons inside/below the drop zone as stacked full-width buttons (matching design pattern).
- **Settings section**: Group "Step" and "Brightness" sliders into a "Dither Settings" card with a section heading. Include "Apply Dither" and "Copy Params" in this section.
- **Color section**: Keep color swatches. Add a "Custom Color" subsection with an `<input type="color">` and hex display below the preset swatches.
- **Output section**: Keep dithered image display as-is.

### 2. Add CSS media queries for mobile (max-width: 640px)

- Reduce body padding from 40px to 16px
- Make drop zone padding smaller (30px instead of 60px)
- Stack control buttons vertically at full width inside/below drop zone
- Make sliders full-width with larger touch targets
- Settings card: full-width with internal padding, rounded border, and section heading
- Color swatches: keep 7-column grid but ensure swatches have adequate touch targets (min 44px)
- Increase button height for touch (min 44px)
- Style the file input as a button (hide native input, use label-as-button pattern)

### 3. Add custom color picker

- Add an `<input type="color">` element below the preset color swatches
- Show the hex value next to/below the color input
- When custom color is selected, use it as the dither color (add as a radio option or deselect presets)
- Wire up JS: on custom color change, convert hex to RGB, update palette, and re-apply dither

### 4. Add "Example Image" button

- Add an "Example Image" button in the drop zone / input section
- On click, explicitly load `fishka.jpeg` (reuse existing `loadImageFromUrl`)
- Keep the auto-load on startup behavior as well

### 5. Style the file input as a proper button

- Hide the native `<input type="file">`
- Use a `<button>` or styled `<label>` that triggers the file input on click
- Match the button styling from the design (full-width on mobile, with icon placeholder)

### 6. Desktop layout preservation

- Use media queries so that on desktop (>640px), the layout remains similar to current (horizontal controls, compact color picker)
- The restructured HTML should work for both layouts via CSS changes only
- Settings card styling applies on both but is more prominent on mobile

## Files to Change

- `index.html` — HTML restructure + new CSS (media queries, card styles, custom color, button styles)
- `script.js` — Add custom color picker logic, "Example Image" button handler, file input trigger from styled button

## Out of Scope

- Changing the dark theme to light
- Renaming "Step" to "Roughness"
- Changing the preset color palette
- Changing the dithering algorithm
- Adding any build tools or dependencies
