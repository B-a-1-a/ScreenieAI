# IdeaForge - Development Tasks & Setup

## 🎯 Project Goal
Build a macOS desktop app (Tauri v2 + React) for turning app ideas into actionable plans through an interactive interview process.

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

## 🖥️ Cross-Platform Development

### Target Platform
- **Production:** macOS app bundle (`.app`)

### Development Platforms
- **macOS:** Full development + final build ✅
- **Linux (RHEL8/Ubuntu):** Development + testing (creates Linux app for testing) ✅
- **Windows:** Development + testing (creates Windows app for testing) ✅

### Key Point
You can develop and test on Linux/Windows, but final macOS build requires macOS.

---

## 🧪 Testing

### Run Tests (Any Platform)
```bash
npm test                  # Frontend tests (Vitest)
cd src-tauri && cargo test  # Rust tests
npm run check            # TypeScript type checking
```

### Dev Mode (Any Platform)
```bash
npm run dev           # Browser only
npm run tauri:dev     # Desktop app (platform-specific window)
```

### Build macOS App (macOS Only)
```bash
npm run tauri:build
open src-tauri/target/release/bundle/macos/IdeaForge.app
```

---

## 🛠️ Quick Setup for New Developers

### Linux (RHEL8/Ubuntu)
```bash
# Install dependencies
sudo dnf install gcc openssl-devel webkit2gtk3-devel curl  # RHEL8
# OR
sudo apt install libwebkit2gtk-4.0-dev build-essential curl  # Ubuntu

# Install Node.js 20+ and Rust
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf/apt install nodejs
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Setup project
git clone <repo> && cd ScreenieAI
npm install
echo "GEMINI_API_KEY=your-key" > .env
npm run tauri:dev
```

### Windows
```powershell
# Install via winget
winget install Microsoft.VisualStudio.2022.BuildTools
winget install Rustlang.Rustup
winget install OpenJS.NodeJS.LTS

# Setup project (same as above)
npm install
npm run tauri:dev
```

### macOS
Same as Linux, plus you can run `npm run tauri:build` for final app.

---

## 📋 Task Checklist

### Phase 1: Interactive Buttons
- [ ] Load prompt from .md file in Rust
- [ ] Add `options` field rendering in UI
- [ ] Create button components
- [ ] Handle button click → submit answer
- [ ] Add "Other" text input fallback
- [ ] Test on all platforms

### Phase 2: IDE-Style UI
- [ ] Design split-panel layout
- [ ] Create PlanPreviewPanel component
- [ ] Show live plan updates
- [ ] Add collapsible sections
- [ ] Style like an IDE (VS Code aesthetic)
- [ ] Add smooth animations

### Phase 3: Testing & Polish
- [ ] Add unit tests for new features
- [ ] Test on Linux/Windows
- [ ] Build final macOS app
- [ ] Update documentation
- [ ] Create demo video

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

- **API Key:** Stored in `~/.ideaforge/settings.json` or loaded from `.env`
- **Interview Limit:** 3 rounds max (already implemented)
- **Platform Testing:** Develop on Linux/Windows, build final app on macOS
- **Frontend Only Mode:** Use `npm run dev` for fast browser testing without Rust

---

## ❓ Common Issues

**Linux:** Missing webkit2gtk → `sudo apt install libwebkit2gtk-4.0-dev`
**Windows:** Missing linker → Install VS Build Tools with C++ workload
**All:** Rust errors → `rustup update && cargo clean && cargo build`

---

## 📚 Resources

- Tauri Docs: https://tauri.app
- Gemini API: https://ai.google.dev
- React: https://react.dev
- Rust: https://rust-lang.org
