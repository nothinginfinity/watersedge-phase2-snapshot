// ============================================================
// watersedge-demo-feature-lab  v1.2.0
// Entry point - routing only. Edit individual src/ files.
// v1.1.1: allow GET /api/publish for browser-triggered demo publishes.
// v1.1.2: add demo chat API and floating widget script route.
// v1.2.0: Phase 1 multiplayer chat rooms.
// ============================================================

import { j } from './utils.js';
import { handleHome } from './handlers/home.js';
import { handlePublish } from './handlers/publish.js';
import { handleLead } from './handlers/lead.js';
import { handleStatus } from './handlers/status.js';
import { handleContent } from './handlers/content.js';
import { handleChat } from './handlers/chat.js';
import { handleChatWidget } from './handlers/chat_widget.js';
import { handleAdmin, handleAdminAuth, handleAdminContent } from './handlers/admin.js';
import {
  handleRoomCreate,
  handleRoomMessages,
  handleRoomMessage,
  handleRoomAssistant,
  handleRoomSummaryLead
} from './handlers/chat_room.js';
import { renderChatRoom, renderChatRoomNotFound } from './render/chat_room.js';
import { dbFirst } from './db.js';

const VERSION = '1.2.0';
const WORKER  = 'watersedge-demo-feature-lab';

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method;
    const slug   = env.DEMO_SLUG || 'default';

    if (method === 'OPTIONS') return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie' }
    });

    // --- existing routes ---
    if (method === 'GET'  && path === '/')                  return handleHome(env, slug);
    if (method === 'GET'  && path === '/chat-widget.js')    return handleChatWidget();
    if ((method === 'POST' || method === 'GET') && path === '/api/publish') return handlePublish(env, slug);
    if (method === 'POST' && path === '/api/chat')          return handleChat(request, env, slug);
    if (method === 'POST' && path === '/api/lead')          return handleLead(request, env, slug);
    if (method === 'GET'  && path === '/api/status')        return handleStatus(env, slug);
    if (method === 'GET'  && path === '/api/content')       return handleContent(env, slug);
    if (method === 'GET'  && path === '/admin')             return handleAdmin(request, env, slug);
    if (method === 'POST' && path === '/admin/auth')        return handleAdminAuth(request, env);
    if (method === 'POST' && path === '/admin/api/content') return handleAdminContent(request, env, slug);

    // --- Phase 1: chat room routes ---
    if (method === 'POST' && path === '/api/chat/room/create')       return handleRoomCreate(request, env, slug);
    if (method === 'GET'  && path === '/api/chat/room/messages')     return handleRoomMessages(request, env, slug);
    if (method === 'POST' && path === '/api/chat/room/message')      return handleRoomMessage(request, env, slug);
    if (method === 'POST' && path === '/api/chat/room/assistant')    return handleRoomAssistant(request, env, slug);
    if (method === 'POST' && path === '/api/chat/room/summary-lead') return handleRoomSummaryLead(request, env, slug);

    // --- chat room page ---
    if (method === 'GET' && path === '/chat-room') {
      const roomId = url.searchParams.get('id') || '';
      if (!roomId) return renderChatRoomNotFound();
      const room = await dbFirst(env, 'SELECT * FROM chat_rooms WHERE id=? AND slug=?', [roomId, slug]);
      if (!room) return renderChatRoomNotFound();
      const messages = await (env.DEMO_DB.prepare('SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 100').bind(roomId).all());
      return renderChatRoom(roomId, { title: room.title, messages: messages.results || [] });
    }

    return j({ ok: false, error: 'not_found', path }, 404);
  }
};
