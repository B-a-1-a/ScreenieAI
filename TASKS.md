# Screenie - Development Tasks & Setup

## 🎯 Project Goal
Build a desktop app (Tauri v2 + React) for turning app ideas into actionable plans through an interactive interview process.

---

## 🚀 Pending Features

### 1. Button-Based Interview (Like Claude Code/Cline)
**Current:** Free-form text input
**Target:** Multiple-choice buttons for quick selection

**Changes Needed:**
- Load system prompt from `prompts/interview-system-prompt.md`
- Display AI-generated options as clickable buttons
- Allow "Other" option with text input fallback
- Update UI to render buttons instead of text-only chat

**Files:** `InterviewPage.tsx`, `gemini.rs`, `models.rs`

---

### 2. IDE-Style Plan Building View
**Current:** Simple chat interface
**Target:** Split view showing plan artifacts being built in real-time

**Layout:**
- Left: Interview chat with button options
- Right: Live preview of plan (Overview, Features, Screens, Tech Stack)
- Collapsible sections
- Auto-updates as interview progresses

**Files:** New components + redesign `InterviewPage.tsx`

---

### 3. Limit to 3 Question Rounds
**Status:** ✅ Done
Automatically stops after 3 Q&A rounds and prompts user to generate plan.

---

## 🧪 Testing

```bash
npm test                  # Frontend tests (Vitest)
cd src-tauri && cargo test  # Rust tests
npm run check            # TypeScript type checking
npm run dev              # Browser only
npm run tauri:dev        # Desktop app
```

---

## 📋 Task Checklist

### Phase 1: Interactive Buttons
- [ ] Load prompt from .md file in Rust
- [ ] Add `options` field rendering in UI
- [ ] Create button components
- [ ] Handle button click → submit answer
- [ ] Add "Other" text input fallback
- [ ] Test interview flow end-to-end

### Phase 2: IDE-Style UI
- [ ] Design split-panel layout
- [ ] Create PlanPreviewPanel component
- [ ] Show live plan updates
- [ ] Add collapsible sections
- [ ] Style like an IDE (VS Code aesthetic)
- [ ] Add smooth animations

### Phase 3: Testing & Polish
- [ ] Add unit tests for new features
- [ ] Update documentation

---

## 🔑 Key Files

```
ScreenieAI/
├── prompts/
│   └── interview-system-prompt.md     # AI instructions
├── src/
│   ├── pages/InterviewPage.tsx        # Main interview UI
│   ├── store/projectStore.ts          # State management
│   └── types/project.ts               # TypeScript types
├── src-tauri/
│   ├── src/
│   │   ├── models.rs                  # Rust data models
│   │   └── services/gemini.rs         # AI integration
│   └── Cargo.toml                     # Rust dependencies
└── .env                               # API key (gitignored)
```

---

## 💡 Notes

- **API Key:** Stored in `~/.screenie/settings.json` or loaded from `.env`
- **Interview Limit:** 3 rounds max (already implemented)
- **Frontend Only Mode:** Use `npm run dev` for fast browser testing without Rust

---

## ❓ Common Issues

**All:** Rust errors → `rustup update && cargo clean && cargo build`
