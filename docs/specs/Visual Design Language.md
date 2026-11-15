# Poker Tracker — Visual Design Language

**Status:** Initial Design Direction  
**Platform:** Mobile-first Web Application  
**Language:** Hebrew  
**Direction:** RTL

## 1. Design Vision

The application should have the visual language of a modern, high-quality fintech application.

The design should feel:

- Clean and minimal.
- Friendly and approachable.
- Modern and polished.
- Calm, without unnecessary visual noise.
- Functional, with strong information hierarchy.

Use the user-provided fintech reference image as the primary visual inspiration.

Do not copy it pixel by pixel. Adapt its visual language to a poker session tracking application.

## 2. Design Principles

### Light and Minimal

- Use a very light neutral background.
- Use white surfaces and cards.
- Avoid dark dashboard styling.
- Avoid unnecessary borders and visual separators.

### Rounded Surfaces

- Cards should have generously rounded corners.
- Buttons and input fields should have consistent rounded shapes.
- Use subtle shadows or very light borders.

### Generous Spacing

- Keep sufficient space between sections.
- Avoid overcrowding.
- Use spacing to establish visual hierarchy.

### Clear Information Hierarchy

- Important amounts should be prominent.
- Player names should be easy to scan.
- Secondary information should be visually quieter.
- The primary action should always be easy to identify.

### Purposeful Colors

Colors should communicate meaning, not merely decorate the interface.

## 3. Color Palette

Suggested starting palette:

| Token             | Color   | Purpose                        |
| ----------------- | ------- | ------------------------------ |
| Background        | #F5F6F4 | Main background                |
| Surface           | #FFFFFF | Cards and panels               |
| Surface Secondary | #EEF1ED | Secondary surfaces             |
| Primary           | #35C653 | Main accent and actions        |
| Primary Soft      | #E7F8E9 | Selected states and highlights |
| Text              | #18221D | Primary text                   |
| Text Secondary    | #77817B | Secondary text                 |
| Border            | #E6EAE6 | Subtle borders                 |
| Positive          | #249B45 | Positive financial results     |
| Negative          | #D94B4B | Negative financial results     |
| Warning           | #D99A2B | Warnings and pending states    |

Green is the main brand accent.

Positive results should be green, negative results red, and neutral values dark.

Do not use color as the only indicator of meaning.

## 4. Typography

Use a modern, highly readable Hebrew sans-serif font.

Preferred options:

- Heebo
- Assistant

Typography hierarchy:

- Screen titles: medium or bold.
- Important financial values: large and bold.
- Section titles: medium weight.
- Player names: medium or semibold.
- Secondary labels and timestamps: smaller and muted.

Use tabular numerals for financial values where possible.

Ensure consistent formatting of currency values.

## 5. Components

### Cards

- White background.
- Rounded corners, approximately 16–22px.
- Subtle shadow or border.
- Consistent internal padding.

Do not wrap every piece of information in a separate card.

### Buttons

Primary buttons:

- Green background.
- White text.
- Rounded corners.
- Comfortable touch area.

Secondary buttons:

- White or neutral background.
- Dark text.

Destructive actions:

- Restrained red treatment.

Touch targets should preferably be at least 44px high.

### Lists

- Clean and readable rows.
- Consistent alignment.
- Subtle separators.
- Adequate spacing between interactive elements.

### Navigation

Use a simple bottom navigation bar.

Navigation labels should be visible alongside icons.

Account for mobile safe areas.

### Inputs

- Clear labels.
- Rounded surfaces.
- Comfortable touch areas.
- Numeric keyboard for amount fields.

## 6. Mobile and RTL

The application must be designed mobile-first.

Hebrew is the primary language.

Requirements:

- RTL layout throughout the application.
- Correct alignment and reading order.
- Direction-aware navigation icons.
- Proper handling of mixed Hebrew, English, dates, and currency.
- Use CSS logical properties instead of hardcoded left/right positioning.

Test on narrow mobile viewports.

## 7. Avoid

- Dark themes as the default.
- Excessive gradients.
- Neon colors.
- Dense tables.
- Too many competing accent colors.
- Unnecessary decorative illustrations.
- Desktop-first layouts squeezed into mobile screens.

## 8. Design Quality Criteria

Every screen should answer these questions:

1. Is the most important information immediately visible?
2. Is the primary action obvious?
3. Is the screen comfortable to use on a phone?
4. Is the Hebrew layout natural?
5. Are financial values easy to scan?
6. Does the screen feel consistent with the rest of the application?

The overall impression should be that of a polished personal finance app, adapted to tracking poker sessions.
