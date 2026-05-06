# Design System — Chat & Video Call (Social Edition)

> **Style:** Instagram-inspired social (warm-pink-purple gradient)
> **Mode:** Light
> **Fonts:** Google Fonts (Sora + DM Sans + DM Mono)
> **Vibe:** Vibrant · Trendy · Energetic
> **Version:** 2.0

---

## 1. Signature Gradient (the brand DNA)

This gradient is the **soul** of the brand — it appears on the logo, primary button, story ring, the sender's message bubble, and the splash screen.

```css
--gradient-signature: linear-gradient(
  135deg,
  #FEDA77 0%,    /* warm yellow */
  #F58529 25%,   /* orange */
  #DD2A7B 50%,   /* magenta pink */
  #8134AF 75%,   /* purple */
  #515BD4 100%   /* blue-purple */
);

/* variants */
--gradient-warm:  linear-gradient(135deg, #FEDA77, #F58529, #DD2A7B);
--gradient-cool:  linear-gradient(135deg, #DD2A7B, #8134AF, #515BD4);
--gradient-soft:  linear-gradient(135deg, #FFF1E6, #FFE0EC, #F0E6FF);
```

**Use it for:**
- ✅ Story avatar ring, primary CTA, sent message bubble
- ✅ Hero gradient text
- ❌ Never as a full-screen background (visually noisy)
- ❌ Never for body copy (low readability)

---

## 2. Color Palette

### 2.1 Brand & primary colors

| Token | HEX | Usage |
| ----- | --- | ----- |
| `--primary-500` | `#DD2A7B` | Brand pink |
| `--primary-600` | `#C2185B` | Hover |
| `--primary-700` | `#A21458` | Active / pressed |
| `--primary-400` | `#EC4899` | Highlight |
| `--primary-200` | `#FBCFE8` | Subtle tint |
| `--primary-100` | `#FCE7F3` | Lightest tint |

### 2.2 Accent colors

| Token | HEX | Usage |
| ----- | --- | ----- |
| `--accent-orange` | `#F58529` | Like, trending |
| `--accent-yellow` | `#FEDA77` | Star, highlight reaction |
| `--accent-purple` | `#8134AF` | Premium, story badge |
| `--accent-blue` | `#515BD4` | Verified, send button |
| `--accent-coral` | `#FF6B6B` | Heart reaction, fire emoji |

### 2.3 Backgrounds (light mode)

Pure white is avoided — surfaces use a warm off-white that pairs naturally with the gradient.

| Token | HEX | Usage |
| ----- | --- | ----- |
| `--bg-base` | `#FFFBFC` | App background |
| `--bg-surface` | `#FFFFFF` | Card, modal |
| `--bg-elevated` | `#FAF7F8` | Sidebar, panel |
| `--bg-overlay` | `#F4EFF1` | Hover state, input field |
| `--bg-tinted` | `#FDF2F8` | Pink-tinted section |
| `--bg-blur` | `rgba(255,251,252,0.8)` | Frosted glass |

### 2.4 Text

| Token | HEX | Usage |
| ----- | --- | ----- |
| `--text-primary` | `#1A1421` | Headings, message body |
| `--text-secondary` | `#5A4F66` | Description, label |
| `--text-tertiary` | `#8E8499` | Timestamp, hint, placeholder |
| `--text-disabled` | `#C4BCC9` | Disabled |
| `--text-on-gradient` | `#FFFFFF` | On signature gradient |
| `--text-on-primary` | `#FFFFFF` | On pink |

### 2.5 Semantic / status

| Token | HEX | Usage |
| ----- | --- | ----- |
| `--success` | `#10B981` | Online status, double-tick |
| `--warning` | `#F59E0B` | Mute, away |
| `--danger` | `#EF4444` | End call, delete, error |
| `--info` | `#3B82F6` | Info banner |
| `--like` | `#FF3B5C` | Heart, like (IG-red) |

### 2.6 Call-specific

| Token | HEX | Usage |
| ----- | --- | ----- |
| `--call-accept` | `#10B981` | Accept button |
| `--call-decline` | `#EF4444` | Decline / end button |
| `--call-mute` | `#8E8499` | Mute mic / camera off |
| `--call-active-bg` | `#1A1421` | In-call background (dark for video) |
| `--call-speaking-ring` | `--gradient-warm` | Speaker glow ring |

> Inside an active call, keep the surrounding chrome dark so video frames stay clean. Outside calls, light mode rules.

### 2.7 Borders

| Token | HEX | Usage |
| ----- | --- | ----- |
| `--border-subtle` | `#F4EFF1` | Light divider |
| `--border-default` | `#E8DDE2` | Input, card border |
| `--border-strong` | `#C4BCC9` | Focus, emphasis |
| `--border-gradient` | `--gradient-signature` | Story ring, premium card |

---

## 3. Typography

### 3.1 Font families

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
```

| Role | Font | Why |
| ---- | ---- | --- |
| Display / Heading | `Sora` | Geometric, modern, futuristic — pairs well with the social vibe |
| Body / UI | `DM Sans` | Friendly, rounded, very readable |
| Mono | `DM Mono` | Same family for code / IDs |

```css
:root {
  --font-display: 'Sora', system-ui, sans-serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-mono:    'DM Mono', monospace;
}
```

### 3.2 Type scale

| Token | Size | Line | Weight | Usage |
| ----- | ---- | ---- | ------ | ----- |
| `--text-display` | 34px | 42px | 700 | Onboarding hero |
| `--text-h1` | 26px | 34px | 700 | Screen title |
| `--text-h2` | 20px | 28px | 600 | Section header |
| `--text-h3` | 18px | 26px | 600 | Username in chat header |
| `--text-body-lg` | 16px | 24px | 400 | Message content |
| `--text-body` | 14px | 20px | 400 | Default UI, button |
| `--text-caption` | 13px | 18px | 500 | Username in list, label |
| `--text-small` | 12px | 16px | 400 | Timestamp, status |
| `--text-tiny` | 11px | 14px | 600 | Badge, counter |

### 3.3 Special treatments

```css
.text-gradient {
  background: var(--gradient-signature);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-family: var(--font-display);
  font-weight: 700;
}

.username-premium {
  background: var(--gradient-warm);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 600;
}
```

---

## 4. Spacing

| Token | Value |
| ----- | ----- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

---

## 5. Border radius (very rounded — IG vibe)

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--radius-sm` | 8px | Tag, badge |
| `--radius-md` | 12px | Button, input |
| `--radius-lg` | 16px | Card, dropdown |
| `--radius-xl` | 24px | Modal, message bubble |
| `--radius-2xl` | 32px | Large container |
| `--radius-full` | 9999px | Avatar, pill button |

---

## 6. Shadow & elevation

Soft pink-tinted shadows give a premium, friendly feel without the heaviness of pure-grey shadows.

```css
--shadow-sm: 0 1px 3px rgba(221, 42, 123, 0.06),  0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(221, 42, 123, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 8px 24px rgba(221, 42, 123, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
--shadow-xl: 0 16px 40px rgba(221, 42, 123, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08);

--glow-gradient: 0 8px 24px rgba(221, 42, 123, 0.35), 0 4px 12px rgba(245, 133, 41, 0.25);
--glow-like:     0 0 20px rgba(255, 59, 92, 0.4);
```

---

## 7. Component color mapping

### 7.1 Chat message bubble

| State | Background | Text |
| ----- | ---------- | ---- |
| Sent (mine) | `var(--gradient-signature)` | white |
| Received | `var(--bg-overlay)` | `--text-primary` |
| System | transparent | `--text-tertiary` |
| Reply quote | `var(--bg-tinted)` | `--text-secondary` + gradient left border |

```css
.message-sent {
  background: var(--gradient-signature);
  color: var(--text-on-gradient);
  border-radius: var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl);
  padding: 10px 16px;
  box-shadow: var(--shadow-md);
}
.message-received {
  background: var(--bg-overlay);
  color: var(--text-primary);
  border-radius: var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm);
  padding: 10px 16px;
}
```

### 7.2 Story ring

```css
.story-ring         { padding: 3px; background: var(--gradient-signature); border-radius: 50%; }
.story-ring--seen   { background: var(--border-default); }
.story-ring img     { border: 2px solid var(--bg-base); border-radius: 50%; }
```

### 7.3 Status indicator

| Status | Color |
| ------ | ----- |
| Online | `--success` |
| Away | `--warning` |
| Busy | `--danger` |
| Offline | `--text-tertiary` |
| In call | `--gradient-warm` + pulse |

### 7.4 Primary CTA (gradient)

```css
.btn-primary {
  background: var(--gradient-signature);
  color: var(--text-on-gradient);
  border-radius: var(--radius-full);
  padding: 12px 24px;
  font-family: var(--font-body);
  font-weight: 600;
  box-shadow: var(--glow-gradient);
  transition: transform 200ms var(--ease-bounce);
}
.btn-primary:hover  { transform: translateY(-2px) scale(1.02); }
.btn-primary:active { transform: translateY(0)  scale(0.98); }
```

### 7.5 Message composer input

```css
.message-input {
  background: var(--bg-overlay);
  border: 1.5px solid transparent;
  color: var(--text-primary);
  border-radius: var(--radius-full);
  padding: 12px 20px;
}
.message-input:focus {
  background: var(--bg-surface);
  border-color: var(--primary-500);
  box-shadow: 0 0 0 4px rgba(221, 42, 123, 0.1);
}
```

### 7.6 Like button

```css
.btn-like { color: var(--text-tertiary); transition: all 200ms var(--ease-bounce); }
.btn-like.liked {
  color: var(--like);
  filter: drop-shadow(var(--glow-like));
  animation: heartPop 400ms var(--ease-bounce);
}
@keyframes heartPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.4); }
  100% { transform: scale(1); }
}
```

---

## 8. Motion

```css
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-spring: cubic-bezier(0.5, 1.25, 0.5, 1);

--duration-instant: 100ms;
--duration-fast:    200ms;
--duration-normal:  300ms;
--duration-slow:    500ms;
```

Signature animations:
- Like → bounce-scale on tap
- Story ring → conic-gradient rotate while loading
- Sent message → slide-up + fade-in from bottom
- Reaction picker → stagger fade-in 50ms per emoji

---

## 9. Full CSS variables (copy & paste)

```css
:root {
  /* signature gradients */
  --gradient-signature: linear-gradient(135deg, #FEDA77 0%, #F58529 25%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%);
  --gradient-warm:      linear-gradient(135deg, #FEDA77, #F58529, #DD2A7B);
  --gradient-cool:      linear-gradient(135deg, #DD2A7B, #8134AF, #515BD4);
  --gradient-soft:      linear-gradient(135deg, #FFF1E6, #FFE0EC, #F0E6FF);

  /* colors */
  --primary-100: #FCE7F3;
  --primary-200: #FBCFE8;
  --primary-400: #EC4899;
  --primary-500: #DD2A7B;
  --primary-600: #C2185B;
  --primary-700: #A21458;

  --accent-orange: #F58529;
  --accent-yellow: #FEDA77;
  --accent-purple: #8134AF;
  --accent-blue:   #515BD4;
  --accent-coral:  #FF6B6B;

  --bg-base:     #FFFBFC;
  --bg-surface:  #FFFFFF;
  --bg-elevated: #FAF7F8;
  --bg-overlay:  #F4EFF1;
  --bg-tinted:   #FDF2F8;
  --bg-blur:     rgba(255, 251, 252, 0.8);

  --text-primary:     #1A1421;
  --text-secondary:   #5A4F66;
  --text-tertiary:    #8E8499;
  --text-disabled:    #C4BCC9;
  --text-on-gradient: #FFFFFF;
  --text-on-primary:  #FFFFFF;

  --success: #10B981;
  --warning: #F59E0B;
  --danger:  #EF4444;
  --info:    #3B82F6;
  --like:    #FF3B5C;

  --call-accept:    #10B981;
  --call-decline:   #EF4444;
  --call-mute:      #8E8499;
  --call-active-bg: #1A1421;

  --border-subtle:  #F4EFF1;
  --border-default: #E8DDE2;
  --border-strong:  #C4BCC9;

  /* type */
  --font-display: 'Sora', system-ui, sans-serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-mono:    'DM Mono', monospace;

  /* spacing */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  /* radius */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-2xl:  32px;
  --radius-full: 9999px;

  /* shadows */
  --shadow-sm: 0 1px 3px rgba(221, 42, 123, 0.06),  0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(221, 42, 123, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 8px 24px rgba(221, 42, 123, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  --shadow-xl: 0 16px 40px rgba(221, 42, 123, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08);

  --glow-gradient: 0 8px 24px rgba(221, 42, 123, 0.35), 0 4px 12px rgba(245, 133, 41, 0.25);
  --glow-like:     0 0 20px rgba(255, 59, 92, 0.4);

  /* motion */
  --ease-smooth:      cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce:      cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring:      cubic-bezier(0.5, 1.25, 0.5, 1);
  --duration-instant: 100ms;
  --duration-fast:    200ms;
  --duration-normal:  300ms;
  --duration-slow:    500ms;
}
```

---

## 10. Accessibility

- `--text-primary` on `--bg-base` → contrast **17.2:1** (AAA)
- `--text-secondary` on `--bg-base` → **7.4:1** (AAA)
- `--primary-500` on white → **4.8:1** (AA)
- Text on signature gradient must be white, weight ≥ 500, with a subtle text-shadow
- Focus rings use `--primary-500` with 4px offset

```css
.text-on-gradient {
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-weight: 500;
}
```

---

## 11. Color swatches

```
SIGNATURE GRADIENT  🟡🟠🩷🟣🔵   (yellow → orange → pink → purple → blue)
─────────────────────────────────────
PRIMARY           ████ #DD2A7B
ACCENT ORANGE     ████ #F58529
ACCENT YELLOW     ████ #FEDA77
ACCENT PURPLE     ████ #8134AF
ACCENT BLUE       ████ #515BD4
LIKE (heart)      ████ #FF3B5C
─────────────────────────────────────
BG BASE           ████ #FFFBFC  (warm white)
BG SURFACE        ████ #FFFFFF
BG OVERLAY        ████ #F4EFF1
BG TINTED         ████ #FDF2F8
─────────────────────────────────────
TEXT PRIMARY      ████ #1A1421
TEXT SECONDARY    ████ #5A4F66
TEXT TERTIARY     ████ #8E8499
```

---

## 12. Versus the previous dark version

| Aspect | Dark Discord-style (v1) | **Light Social-style (v2)** |
| ------ | ---------------------- | --------------------------- |
| Mood | Tech, focused, gaming | **Trendy, social, warm** |
| Primary | Indigo `#6366F1` | **Pink `#DD2A7B`** |
| Background | Deep navy black | **Warm off-white** |
| Signature | Glow effect | **Multi-stop gradient** |
| Best for | Power users, devs | **Gen Z, creators, lifestyle** |

---

**Pro tip.** When using gradient generously, keep **70% of the UI neutral** (background, text) and reserve the **30% gradient** for focal points. The gradient is most powerful as an accent, not a background.

---

## 13. Tailwind / Flutter token map

The same tokens are exposed to both clients:

| CSS variable | Tailwind class | Flutter `AppTheme` |
| ------------ | -------------- | ------------------ |
| `--primary-500` | `bg-primary-500` / `text-primary-500` | `AppColors.primary` |
| `--gradient-signature` | `bg-gradient-signature` | `AppGradients.signature` |
| `--bg-base` | `bg-base` | `AppColors.bgBase` |
| `--text-primary` | `text-ink-primary` | `AppColors.textPrimary` |
| `--font-display` | `font-display` | `AppTypography.display` |
| `--radius-xl` | `rounded-xl` (24px) | `AppRadius.xl` |
| `--shadow-md` | `shadow-soft-md` | `AppShadows.md` |

See [`clients/web/src/styles/tokens.css`](../clients/web/src/styles/tokens.css) and `clients/apps/lib/theme/` for the canonical implementations.
