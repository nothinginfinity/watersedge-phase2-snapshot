# Mobile Chat Room UI/UX HTML Spec

**Project:** Waters Edge / Collaborative AI Sales Rooms  
**File type:** `html.spec.md`  
**Target:** Mobile-first implementation that can wire into the existing D1-backed multiplayer chat room quickly.  
**Goal:** Make chat, invite, and shared planning first-class without replacing the existing backend.

---

## 1. Product Thesis

The website should not feel like a normal brochure site with a chat widget attached.

It should feel like a **mobile AI-native planning room** where one visitor can become a shared buying session.

Core positioning:

> Turn one visitor into a shared planning session, capture structured buying intent, and help the business convert more of the traffic it already paid for.

For Waters Edge:

> Plan dinner together. Invite someone, ask the menu concierge, build plates, compare picks, and send a reservation request.

---

## 2. Design Principles

1. **Mobile first, room first**  
   The room is the primary conversion surface. The normal site is the lobby.

2. **Invite is not a link**  
   Invite is a role-based workflow. The user is not copying a URL; they are inviting someone to help decide.

3. **Chat is one mode, not the whole product**  
   Chat should sit beside Build Meal, Vote, and Reservation modes.

4. **Fast to wire into current backend**  
   Start with existing `chat_rooms`, `chat_messages`, `demo_leads`, and `metadata_json`. Add optional tables only after the UI proves value.

5. **Emoji first, images later**  
   Use emoji tiles for the Build Meal board now. R2 image assets can be layered in later using item metadata.

---

## 3. Existing Backend Compatibility

This spec assumes the current backend already supports:

- `chat_rooms`
- `chat_messages`
- `chat_participants` reserved / available for Phase 3
- `demo_leads`
- D1 persistence
- 3-second message polling
- participant identity in localStorage
- `metadata_json` on messages
- room creation endpoint
- message list endpoint
- message post endpoint
- assistant reply endpoint
- lead / reservation summary endpoint

Existing endpoints can remain:

```txt
POST /api/chat/room/create
GET  /api/chat/room/messages?id={roomId}
POST /api/chat/room/message
POST /api/chat/room/assistant
POST /api/chat/room/summary-lead
```

Recommended new lightweight endpoints:

```txt
POST /api/chat/room/invite
POST /api/chat/room/join
GET  /api/chat/room/state?id={roomId}
POST /api/chat/room/state
```

For the fastest MVP, `room_state` can be stored inside `chat_rooms.metadata_json` if adding a new table is slower.

---

## 4. Mobile Layout Overview

### 4.1 Page Structure

```html
<body class="we-mobile-room">
  <header class="we-room-topbar"></header>
  <section class="we-room-status"></section>
  <nav class="we-room-tabs"></nav>
  <main class="we-room-main"></main>
  <footer class="we-room-composer"></footer>
  <div class="we-modal-layer"></div>
</body>
```

### 4.2 Mobile Viewport Rules

- Target width: 360px to 430px.
- Use full viewport height.
- Composer is sticky/fixed at bottom.
- Header is sticky/fixed at top.
- Tabs remain visible below participant status.
- Avoid large desktop sidebars on mobile.
- Use bottom sheets or centered modals for role-based invite.

---

## 5. Primary Screens

## Screen A: Mobile Website Lobby

The public website still exists, but its primary CTA should push into the planning room.

### Hero CTA

```html
<section class="we-hero-room-card">
  <p class="we-kicker">AI Dining Concierge</p>
  <h1>Plan dinner together.</h1>
  <p>
    Invite someone, ask the Waters Edge concierge, compare menu picks,
    build your plates, and send a reservation request when you are ready.
  </p>
  <button data-action="create-room" class="we-primary-cta">
    🍽️ Start Planning Room
  </button>
  <button data-action="view-menu" class="we-secondary-cta">
    View Menu
  </button>
</section>
```

### Sticky CTA

Replace generic chat copy with room-first copy.

```html
<button class="we-sticky-room-cta" data-action="create-room">
  💬 Plan Together
</button>
```

Preferred labels:

- `Plan Together`
- `Start Planning Room`
- `Build Meal Together`
- `Ask + Invite`

Avoid primary labels like:

- `Chat`
- `Support`
- `Bot`
- `Copy Link`

---

## Screen B: Room Header

### Purpose

The room header should make it clear the user is inside a shared buying session.

```html
<header class="we-room-topbar">
  <button class="we-icon-btn" data-action="back">‹</button>
  <div class="we-room-title-wrap">
    <div class="we-room-title">Waters Edge Planning Room</div>
    <div class="we-room-subtitle">Private room · Invite someone to plan</div>
  </div>
  <button class="we-invite-pill" data-action="open-invite-modal">
    Invite
  </button>
</header>
```

### Requirements

- Invite button always visible.
- Do not hide invite inside a secondary menu.
- On very small screens, use icon + text: `👥 Invite`.

---

## Screen C: Participant / Room Status Strip

### Purpose

Make multiplayer visible even when only one person is present.

```html
<section class="we-room-status">
  <div class="we-participant-chip self">
    <span class="we-dot" style="background:#0b8f86"></span>
    <span>You</span>
    <span class="we-role">Primary Guest</span>
  </div>

  <button class="we-participant-chip waiting" data-action="open-invite-modal">
    <span>＋</span>
    <span>Invite someone</span>
  </button>
</section>
```

When a friend joins:

```html
<div class="we-participant-chip other">
  <span class="we-dot" style="background:#c0392b"></span>
  <span>Sarah</span>
  <span class="we-role">Dining Partner</span>
</div>
```

### Backend Mapping

Participant display can be derived from:

- localStorage identity for self
- `chat_messages.metadata_json.participant_id`
- optional `chat_participants` rows later
- optional `room_state.participants` inside `chat_rooms.metadata_json`

Fast MVP path:

- Keep current localStorage identity.
- Store invitee role in invite link params or room metadata.
- On first message from invitee, attach role to `metadata_json`.

---

## Screen D: Mode Tabs

### Purpose

Chat is not the whole product. The room has modes.

```html
<nav class="we-room-tabs" role="tablist">
  <button class="active" data-mode="chat">💬 Chat</button>
  <button data-mode="build">🍽️ Build</button>
  <button data-mode="vote">⭐ Vote</button>
  <button data-mode="reserve">📅 Reserve</button>
</nav>
```

### MVP Priority

1. Chat
2. Build
3. Reserve
4. Vote later

### State

```js
roomState.activeMode = 'chat' | 'build' | 'vote' | 'reserve';
```

This can be client-only at first. Persist later if needed.

---

## Screen E: Chat Mode

### Purpose

Chat remains the assistant-led interface.

```html
<main class="we-room-main" data-mode="chat">
  <div class="we-message-log" id="msg-log"></div>
</main>

<footer class="we-room-composer">
  <button class="we-attach-btn" data-action="attach">📎</button>
  <input id="chat-input" placeholder="Ask about the menu or plan your visit..." />
  <button class="we-send-btn" data-action="send">➤</button>
</footer>
```

### Assistant Response Pattern

Plain text is acceptable for MVP, but assistant should start returning structured action hints.

Example message text:

```txt
For date night, I would compare these:
• Filet Mignon
• Seafood Risotto
• Bacon Jam Scallops

Want to invite someone or build plates together?
```

Optional action card below assistant message:

```html
<div class="we-assistant-actions">
  <button data-action="open-invite-modal">Invite someone</button>
  <button data-mode="build">Build plates</button>
  <button data-mode="reserve">Reserve</button>
</div>
```

Fast backend path:

- Keep assistant messages as strings.
- Render action chips client-side when keywords appear, such as `invite`, `reservation`, `date night`, `seafood`, `steak`.

---

## Screen F: Role-Based Invite Modal

### Purpose

The invite flow should copy the Lawyers & Dragons pattern: choose the role of the person joining.

The role makes the invitation meaningful and gives the AI context.

```html
<div class="we-modal-backdrop" data-modal="invite">
  <section class="we-invite-modal" role="dialog" aria-modal="true">
    <header class="we-modal-header">
      <h2>👥 Invite Someone to Plan</h2>
      <button data-action="close-modal">×</button>
    </header>

    <p class="we-modal-copy">
      Invite someone into this private planning room. They can help compare menu items,
      build a meal, ask the AI concierge questions, and send a reservation request with you.
    </p>

    <div class="we-role-list">
      <button class="we-role-card selected" data-invite-role="dining_partner">
        <span class="we-role-emoji">🍽️</span>
        <span>
          <strong>Dining Partner</strong>
          <small>Someone joining you for the meal</small>
        </span>
      </button>

      <button class="we-role-card" data-invite-role="friend_helper">
        <span class="we-role-emoji">💬</span>
        <span>
          <strong>Friend / Helper</strong>
          <small>Someone helping you decide what to order</small>
        </span>
      </button>

      <button class="we-role-card" data-invite-role="wine_helper">
        <span class="we-role-emoji">🍷</span>
        <span>
          <strong>Wine / Pairing Helper</strong>
          <small>Someone helping choose drinks or pairings</small>
        </span>
      </button>

      <button class="we-role-card" data-invite-role="event_planner">
        <span class="we-role-emoji">🎉</span>
        <span>
          <strong>Event Planner</strong>
          <small>Someone helping plan a group dinner or special occasion</small>
        </span>
      </button>
    </div>

    <footer class="we-modal-actions">
      <button class="we-secondary" data-action="close-modal">Cancel</button>
      <button class="we-primary" data-action="generate-invite-link">
        Create Planning Invite
      </button>
    </footer>
  </section>
</div>
```

### Generated Invite Copy

After generating:

```html
<section class="we-generated-invite">
  <label>Send this invite:</label>
  <textarea readonly>
Help me plan dinner at Waters Edge 🍽️
Join my private planning room here:
{shareUrl}
  </textarea>
  <button data-action="copy-generated-invite">Copy Invite</button>
  <button data-action="native-share">Share</button>
</section>
```

### Mobile Behavior

- If `navigator.share` exists, show native share button.
- Always keep copy button as fallback.
- Invite modal should fit 360px screens.
- Role cards should be large tap targets.

### Backend Mapping

Invite payload:

```json
{
  "room_id": "ROOM_ID",
  "inviter_participant_id": "p123",
  "invitee_role": "dining_partner",
  "invitee_role_label": "Dining Partner"
}
```

Response:

```json
{
  "ok": true,
  "invite_id": "inv_abc123",
  "share_url": "https://.../chat-room?id=ROOM_ID&invite=inv_abc123&role=dining_partner",
  "share_text": "Help me plan dinner at Waters Edge 🍽️\nJoin my private planning room here: https://..."
}
```

Fast MVP without new endpoint:

- Generate URL client-side:

```js
const shareUrl = `${baseRoomUrl}&role=${selectedRole}`;
```

- Store selected role into local room state when invitee joins.
- Add the role to first message `metadata_json`.

Better version:

- Create `chat_invites` table.

```sql
CREATE TABLE IF NOT EXISTS chat_invites (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  inviter_participant_id TEXT,
  invitee_role TEXT,
  invitee_role_label TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT,
  joined_at TEXT
);
```

---

## Screen G: Build Meal Mode

### Purpose

Build mode turns the room into a simple shared game board.

MVP should use tap-to-add emoji tiles. Drag/drop can come later.

```html
<main class="we-room-main" data-mode="build">
  <section class="we-plates">
    <article class="we-plate-card self">
      <header>
        <strong>Your Plate</strong>
        <small>Primary Guest</small>
      </header>
      <div class="we-plate-emoji-row" data-player="self">
        🍽️
      </div>
    </article>

    <article class="we-plate-card other">
      <header>
        <strong>Friend's Plate</strong>
        <small>Waiting for invite</small>
      </header>
      <div class="we-plate-emoji-row" data-player="other">
        🍽️ ＋
      </div>
    </article>
  </section>

  <section class="we-menu-token-section">
    <h3>Mains</h3>
    <div class="we-token-row">
      <button class="we-food-token" data-item-id="filet_mignon" data-emoji="🥩">🥩 Filet</button>
      <button class="we-food-token" data-item-id="salmon" data-emoji="🍣">🍣 Salmon</button>
      <button class="we-food-token" data-item-id="burger" data-emoji="🍔">🍔 Burger</button>
    </div>
  </section>

  <section class="we-menu-token-section">
    <h3>Sides</h3>
    <div class="we-token-row">
      <button class="we-food-token" data-item-id="potatoes" data-emoji="🥔">🥔 Potatoes</button>
      <button class="we-food-token" data-item-id="salad" data-emoji="🥗">🥗 Salad</button>
    </div>
  </section>

  <section class="we-menu-token-section">
    <h3>Drinks + Dessert</h3>
    <div class="we-token-row">
      <button class="we-food-token" data-item-id="red_wine" data-emoji="🍷">🍷 Wine</button>
      <button class="we-food-token" data-item-id="dessert" data-emoji="🍰">🍰 Dessert</button>
    </div>
  </section>
</main>
```

### Cart State Shape

```json
{
  "plates": {
    "p_self": {
      "participant_id": "p_self",
      "name": "Jared",
      "role": "Primary Guest",
      "items": [
        { "item_id": "filet_mignon", "emoji": "🥩", "label": "Filet Mignon", "category": "main" },
        { "item_id": "potatoes", "emoji": "🥔", "label": "Potatoes", "category": "side" },
        { "item_id": "red_wine", "emoji": "🍷", "label": "Red Wine", "category": "drink" }
      ]
    }
  }
}
```

### Fast Backend Path

To avoid adding a new table immediately, store plate changes as system-like chat messages with metadata.

Message:

```json
{
  "role": "user",
  "name": "Jared",
  "message": "added 🥩 Filet Mignon to their plate",
  "metadata_json": {
    "type": "plate_event",
    "participant_id": "p123",
    "event": "add_item",
    "item_id": "filet_mignon",
    "emoji": "🥩",
    "label": "Filet Mignon",
    "category": "main"
  }
}
```

The client can reconstruct plates by scanning latest messages for `metadata_json.type === 'plate_event'`.

Better version:

```sql
CREATE TABLE IF NOT EXISTS room_plate_items (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  emoji TEXT,
  label TEXT,
  category TEXT,
  position INTEGER DEFAULT 0,
  created_at TEXT
);
```

Recommended MVP:

- Start with `plate_event` messages.
- Add `room_plate_items` after UI validates.

---

## Screen H: Reserve Mode

### Purpose

Reservation form should use the room context and eventually include plate summaries.

```html
<main class="we-room-main" data-mode="reserve">
  <section class="we-reserve-card">
    <h2>Send a Reservation Request</h2>
    <p>We will include your chat and meal plan so the team knows what you are considering.</p>

    <input name="name" placeholder="Your name" />
    <input name="email" placeholder="Email" />
    <input name="phone" placeholder="Phone" />
    <div class="we-two-col">
      <input name="party_size" placeholder="Party size" />
      <input name="preferred_time" placeholder="Time" />
    </div>
    <input name="preferred_date" placeholder="Date" />
    <input name="occasion" placeholder="Occasion, optional" />

    <section class="we-room-summary-preview">
      <strong>Room Summary</strong>
      <p>Jared is interested in 🥩 🥔 🍷. Friend is interested in 🍣 🥗.</p>
    </section>

    <button data-action="submit-reservation">Send Request</button>
  </section>
</main>
```

### Backend Mapping

Use existing:

```txt
POST /api/chat/room/summary-lead
```

Add plate summary into the final `summary` string when available.

Example final lead:

```txt
[chat-room] Room: abc123 | Intent: date night | Participants: Jared: Primary Guest, Sarah: Dining Partner | Plates: Jared: 🥩 Filet, 🥔 Potatoes, 🍷 Wine | Sarah: 🍣 Salmon, 🥗 Salad | Occasion: Anniversary | Excerpt: ...
```

---

## 6. CSS Direction

Mobile-first visual language:

```css
.we-mobile-room {
  min-height: 100svh;
  background: #f5f0e8;
  color: #14110d;
  font-family: Inter, system-ui, sans-serif;
}

.we-room-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #14110d;
  color: #fff;
}

.we-invite-pill,
.we-primary-cta,
.we-primary {
  border: 0;
  border-radius: 999px;
  background: #0b8f86;
  color: #fff;
  font-weight: 800;
  min-height: 42px;
  padding: 0 14px;
}

.we-room-status {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid rgba(20,17,13,.1);
}

.we-participant-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(20,17,13,.14);
  border-radius: 999px;
  padding: 7px 10px;
  white-space: nowrap;
  font-size: 12px;
  background: #f5f0e8;
}

.we-room-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fff;
  border-bottom: 1px solid rgba(20,17,13,.1);
}

.we-room-tabs button {
  border: 0;
  background: transparent;
  padding: 10px 4px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(20,17,13,.62);
}

.we-room-tabs button.active {
  color: #0b8f86;
  border-bottom: 3px solid #0b8f86;
}

.we-room-main {
  padding: 12px;
  padding-bottom: 88px;
}

.we-room-composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid rgba(20,17,13,.12);
}

.we-room-composer input {
  flex: 1;
  border: 1px solid rgba(20,17,13,.18);
  border-radius: 999px;
  padding: 0 14px;
  min-height: 44px;
  background: #f5f0e8;
}

.we-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: flex-end;
}

.we-invite-modal {
  width: 100%;
  max-height: 92svh;
  overflow-y: auto;
  background: #fff;
  border-radius: 22px 22px 0 0;
  padding: 16px;
}

.we-role-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 76px;
  padding: 12px;
  border: 1px solid rgba(20,17,13,.12);
  border-radius: 16px;
  background: #fff;
  text-align: left;
  margin-bottom: 10px;
}

.we-role-card.selected {
  border-color: #0b8f86;
  box-shadow: 0 0 0 3px rgba(11,143,134,.12);
}

.we-plate-card,
.we-reserve-card,
.we-menu-token-section {
  background: #fff;
  border: 1px solid rgba(20,17,13,.1);
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 12px;
}

.we-token-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-top: 8px;
}

.we-food-token {
  border: 1px solid rgba(20,17,13,.14);
  border-radius: 999px;
  background: #f5f0e8;
  padding: 10px 12px;
  font-weight: 800;
  white-space: nowrap;
}
```

---

## 7. JavaScript Events

Recommended client events:

```js
const actions = {
  openInviteModal,
  selectInviteRole,
  generateInviteLink,
  nativeShareInvite,
  copyInvite,
  switchMode,
  addItemToPlate,
  removeItemFromPlate,
  submitReservation,
  pollRoomMessages,
  pollRoomState
};
```

### Invite Role State

```js
let selectedInviteRole = 'dining_partner';

const inviteRoles = {
  dining_partner: {
    label: 'Dining Partner',
    emoji: '🍽️',
    helper: 'Someone joining you for the meal'
  },
  friend_helper: {
    label: 'Friend / Helper',
    emoji: '💬',
    helper: 'Someone helping you decide what to order'
  },
  wine_helper: {
    label: 'Wine / Pairing Helper',
    emoji: '🍷',
    helper: 'Someone helping choose drinks or pairings'
  },
  event_planner: {
    label: 'Event Planner',
    emoji: '🎉',
    helper: 'Someone helping plan a group dinner or special occasion'
  }
};
```

### Generate Invite MVP

```js
function generateInviteLink() {
  const url = new URL(window.location.href);
  url.searchParams.set('role', selectedInviteRole);
  url.searchParams.set('invite_role_label', inviteRoles[selectedInviteRole].label);

  const shareText = `Help me plan dinner at Waters Edge 🍽️\nJoin my private planning room here:\n${url.toString()}`;

  return {
    share_url: url.toString(),
    share_text: shareText,
    invitee_role: selectedInviteRole,
    invitee_role_label: inviteRoles[selectedInviteRole].label
  };
}
```

### Native Share

```js
async function shareInvite(invite) {
  if (navigator.share) {
    await navigator.share({
      title: 'Help me plan dinner',
      text: invite.share_text,
      url: invite.share_url
    });
    return;
  }

  await navigator.clipboard.writeText(invite.share_text);
}
```

### Join Role on Load

```js
function readInviteRoleFromUrl() {
  const url = new URL(window.location.href);
  return {
    role: url.searchParams.get('role') || '',
    roleLabel: url.searchParams.get('invite_role_label') || ''
  };
}
```

When the invited user sends their first message, include:

```json
{
  "participant_id": "p456",
  "client_message_id": "cm789",
  "invitee_role": "dining_partner",
  "invitee_role_label": "Dining Partner"
}
```

---

## 8. Minimal Backend Changes

### 8.1 No-New-Table MVP

Use existing `chat_messages.metadata_json` for:

- participant id
- participant color
- client message id
- invite role
- plate event

Example metadata:

```json
{
  "participant_id": "p123",
  "color": "#0b8f86",
  "client_message_id": "cm123",
  "invitee_role": "dining_partner",
  "invitee_role_label": "Dining Partner"
}
```

Plate event metadata:

```json
{
  "type": "plate_event",
  "participant_id": "p123",
  "event": "add_item",
  "item_id": "filet_mignon",
  "emoji": "🥩",
  "label": "Filet Mignon",
  "category": "main"
}
```

Pros:

- fastest to test
- no migration required
- works with current polling endpoint

Cons:

- reconstructing current plate requires scanning messages
- removing/reordering items is less clean

### 8.2 Recommended Phase 2 Tables

```sql
CREATE TABLE IF NOT EXISTS chat_invites (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  inviter_participant_id TEXT,
  invitee_role TEXT,
  invitee_role_label TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT,
  joined_at TEXT
);

CREATE TABLE IF NOT EXISTS room_plate_items (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  emoji TEXT,
  label TEXT,
  category TEXT,
  position INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS room_state (
  room_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  active_mode TEXT DEFAULT 'chat',
  turn_mode TEXT DEFAULT 'off',
  current_turn_participant_id TEXT,
  current_stage TEXT,
  metadata_json TEXT,
  updated_at TEXT
);
```

---

## 9. Assistant Behavior Changes

The assistant should mention invite/build naturally but not aggressively.

### Welcome Message

```txt
Welcome to your Waters Edge planning room 🍽️

You can ask me about the menu, invite someone to help choose, build plates together, or send a reservation request when ready.
```

### If user asks about menu

Add soft CTA:

```txt
Want to build a plate from these or invite someone to compare with you?
```

### If second participant joins

```txt
Welcome, Sarah — Jared invited you as a Dining Partner. You can ask questions, build your own plate, or help compare options.
```

### If plate events happen

```txt
Nice — Jared is building a steak dinner with 🥩 🥔 🍷. Want a wine pairing or dessert idea?
```

---

## 10. Analytics / Sales Metrics

Track events client-side or server-side later:

```txt
room_created
invite_modal_opened
invite_role_selected
invite_generated
native_share_clicked
invitee_joined
message_sent
mode_switched_build
plate_item_added
reservation_started
reservation_submitted
```

Key metric:

```txt
Invite Multiplier = invited participants joined / paid visitors who started a room
```

Sales story:

> We turn one paid click into a shared planning session.

---

## 11. Quick Implementation Plan

### Day 1: UI Shell

- Rename sticky CTA to `Plan Together`.
- Add role-based invite modal.
- Add room header invite button.
- Add participant strip.
- Add mode tabs.

### Day 2: Invite Wiring

- Generate invite link with `role` query param.
- Use native share where available.
- Save joined role into localStorage.
- Include role in message metadata.

### Day 3: Build Mode MVP

- Add `Build` tab.
- Hard-code first emoji menu tokens.
- On tap, post `plate_event` message.
- Reconstruct plates from messages.

### Day 4: Lead Summary

- Include participants, roles, and plate summary in reservation request.
- Add assistant prompts that mention invite/build.

### Day 5: Polish

- Add empty states.
- Add share copy.
- Add mobile safe-area styling.
- Test 2 phones joining same room.

---

## 12. Definition of Done

MVP is done when:

1. Mobile visitor can start a planning room.
2. Invite button is visible in room header.
3. Invite modal lets user choose invitee role.
4. Generated link opens same room for second user.
5. Second user can chat in same room.
6. Messages show participant identity/colors.
7. Build tab lets each participant add emoji items to their own plate.
8. Both users can see plate updates through polling.
9. Reservation request includes room transcript and plate summary.
10. Existing backend remains largely intact.

---

## 13. Reusable Vertical Presets

The same role-based invite system should become a reusable product primitive.

### Restaurant

- Dining Partner
- Friend / Helper
- Wine / Pairing Helper
- Event Planner

### Contractor

- Spouse / Partner
- Property Owner
- Designer / Advisor
- Project Stakeholder

### Fitness / Nutrition

- Trainer / Coach
- Accountability Partner
- Friend / Family
- Client

### Legal

- Witness
- Support Person
- Co-Plaintiff

### Retail

- Friend
- Stylist
- Gift Recipient
- Partner

---

## 14. Core Product Primitive

The invite is not just a link.

The invite assigns a role in the buying decision.

That role gives the AI context, gives the room structure, and gives the business a better lead.
