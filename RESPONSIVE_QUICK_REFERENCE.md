# Responsive Design Quick Reference

## Changes Made to Support Mobile, Tablet & Desktop

### Navbar/Header Fixes
```
Desktop (≥1024px)        Tablet (768-1023px)      Mobile (≤767px)
┌─────────────────────┐  ┌──────────────────┐    ┌──────────┐
│ ☰  Logo Title       │  │ ☰ Logo Title     │    │ ☰ Logo T │
└─────────────────────┘  └──────────────────┘    └──────────┘
Full size logo (40px)    Medium logo (40px)     Small logo (32px)
Full title visible       Full title visible      Title truncates
```

### Layout Structure
```
Desktop Layout              Mobile Layout
┌───────────────────┐     ┌──────────────┐
│ ☰ Logo Title      │     │ ☰ Logo Title │  ← Fixed navbar
└───────────────────┘     └──────────────┘
┌─────────┬────────│     │              │
│ Sidebar │ Content│     │   Content    │  ← Full width, no sidebar
│         │        │     │              │
│ (64px   │(flex)  │     │ (sidebar     │
│  expanded         │     │  hidden)     │
│  or 96px         │     │              │
│  collapsed)      │     │              │
└─────────┴────────┘     └──────────────┘
```

### Grid Layouts
```
Desktop                  Tablet                   Mobile
┌─────┬─────┬─────┐    ┌──────┬──────┐          ┌─────────┐
│  1  │  2  │  3  │    │  1   │  2   │          │    1    │
├─────┼─────┼─────┤    ├──────┼──────┤          ├─────────┤
│  4  │  5  │  6  │    │  3   │  4   │          │    2    │
└─────┴─────┴─────┘    └──────┴──────┘          ├─────────┤
3 columns              2 columns                 │    3    │
gap-6                  gap-6                     └─────────┘
                                                 1 column
                                                 gap-4
```

### Form/Modal Positioning
```
Desktop Modal            Mobile Modal
┌──────────────────┐    ┌─────────────┐
│ Empty space      │    │             │
│                  │    │             │
│  ┌────────────┐  │    │ ┌─────────┐ │
│  │   Modal    │  │    │ │  Modal  │ │
│  │  (centered)│  │    │ │ (bottom │ │
│  └────────────┘  │    │ │ sheet)  │ │
│                  │    │ └─────────┘ │
└──────────────────┘    └─────────────┘
centered on screen      slides up from bottom
rounded all corners     rounded top only
```

### Font & Spacing Scaling
```
Component         Mobile        Tablet          Desktop
─────────────────────────────────────────────────────
Heading           text-2xl      text-3xl        text-4xl
Card Title        text-sm       text-base       text-base
Button Text       text-xs       text-sm         text-sm
Card Padding      p-4           p-5             p-6
Card Gap          gap-4         gap-5           gap-6
Input Padding     px-3 py-2     px-3 py-2       px-4 py-2
Avatar Size       32px/40px     40px/48px       48px/56px
```

## Responsive Classes Used

| Class Pattern | Effect |
|---|---|
| `hidden md:flex` | Hide on mobile, show on tablet+ |
| `w-full sm:w-auto` | Full width on mobile, auto on tablet+ |
| `flex-col sm:flex-row` | Stack on mobile, row on tablet+ |
| `text-sm sm:text-base md:text-lg` | Increase font size progressively |
| `px-3 sm:px-4 md:px-6` | Increase padding progressively |
| `gap-4 sm:gap-5 lg:gap-6` | Increase gap progressively |
| `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | Progressive grid columns |

## CSS Tailwind Breakpoints
- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

## Touch Target Sizes
✅ All buttons and interactive elements on mobile:
- Minimum 44x44px touch target
- Adequate spacing between buttons
- Large enough text for readability

## Tested Scenarios
- ✅ Desktop: 1920x1080, 1366x768, 1024x768
- ✅ Tablet: 768x1024, 800x600
- ✅ Mobile: 375x667 (iPhone), 412x915 (Android), 360x640 (smaller phones)
- ✅ Orientation: Portrait and Landscape
- ✅ No horizontal scrolling on any device
- ✅ All modals responsive
- ✅ All forms functional on mobile
- ✅ Sidebar toggle works on mobile

## Design Philosophy
1. **Mobile First**: Design for smallest screens first
2. **Progressive Enhancement**: Add complexity for larger screens
3. **Touch Friendly**: Larger buttons and spacing on mobile
4. **Desktop Unchanged**: Desktop experience preserved exactly
5. **No Breakage**: All existing features work on all devices
