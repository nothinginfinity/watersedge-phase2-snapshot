// ============================================================
// watersedge-phase2-snapshot  v1.5.0
// v1.5.0: Phase 5A - participant identity, join flow, player numbers
// ============================================================

import { j } from './utils.js';
import { handleHome } from './handlers/home.js';
import { handlePublish } from './handlers/publish.js';
import { handleLead } from './handlers/lead.js';
import { handleStatus } from './handlers/status.js';
import { handleContent } from './handlers/content.js';
import { handleChat } from './handlers/chat.js';
import { handleChatWidget } from './handlers/chat_widget.js';
import { handleAdmin, handleAdminPipeline, handleAdminAuth, handleAdminContent } from './handlers/admin.js';
import {
  handleRoomCreate,
  handleRoomJoin,
  handleRoomParticipants,
  handleRoomMessages,
  handleRoomMessage,
  handleRoomAssistant,
  handleRoomSummaryLead
} from './handlers/chat_room.js';
import {
  handlePipelineStatus,
  handlePipelineSmoke,
  handleR2List
} from './handlers/pipeline.js';
import {
  handleIngestMenu,
  handleIngestWine,
  handleContentSearch,
  handleContentDocuments
} from './handlers/ingest.js';
import { renderChatRoom, renderChatRoomNotFound } from './render/chat_room.js';
import { dbFirst } from './db.js';

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method;
    const slug   = env.DEMO_SLUG || 'default';

    if (method === 'OPTIONS') return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie' }
    });

    if (method === 'GET'  && path === '/')                  return handleHome(env, slug);
    if (method === 'GET'  && path === '/chat-widget.js')    return handleChatWidget();
    if ((method === 'POST' || method === 'GET') && path === '/api/publish') return handlePublish(env, slug);
    if (method === 'POST' && path === '/api/chat')          return handleChat(request, env, slug);
    if (method === 'POST' && path === '/api/lead')          return handleLead(request, env, slug);
    if (method === 'GET'  && path === '/api/status')        return handleStatus(env, slug);
    if (method === 'GET'  && path === '/api/content')       return handleContent(env, slug);
    if (method === 'GET'  && path === '/admin')             return handleAdmin(request, env, slug);
    if (method === 'GET'  && path === '/admin/pipeline')    return handleAdminPipeline(request, env, slug);
    if (method === 'POST' && path === '/admin/auth')        return handleAdminAuth(request, env);
    if (method === 'POST' && path === '/admin/api/content') return handleAdminContent(request, env, slug);

    // Chat room routes
    if (method === 'POST' && path === '/api/chat/room/create')       return handleRoomCreate(request, env, slug);
    if (method === 'POST' && path === '/api/chat/room/join')         return handleRoomJoin(request, env, slug);
    if (method === 'GET'  && path === '/api/chat/room/participants') return handleRoomParticipants(request, env, slug);
    if (method === 'GET'  && path === '/api/chat/room/messages')     return handleRoomMessages(request, env, slug);
    if (method === 'POST' && path === '/api/chat/room/message')      return handleRoomMessage(request, env, slug);
    if (method === 'POST' && path === '/api/chat/room/assistant')    return handleRoomAssistant(request, env, slug);
    if (method === 'POST' && path === '/api/chat/room/summary-lead') return handleRoomSummaryLead(request, env, slug);

    // Chat room page
    if (method === 'GET' && path === '/chat-room') {
      const roomId = url.searchParams.get('id') || '';
      if (!roomId) return renderChatRoomNotFound();
      const room = await dbFirst(env, 'SELECT * FROM chat_rooms WHERE id=? AND slug=?', [roomId, slug]);
      if (!room) return renderChatRoomNotFound();
      const messages = await (env.DEMO_DB.prepare('SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 100').bind(roomId).all());
      return renderChatRoom(roomId, { title: room.title, messages: messages.results || [] });
    }

    // Pipeline routes
    if (method === 'GET'  && path === '/api/pipeline/status') return handlePipelineStatus(request, env, slug);
    if (method === 'POST' && path === '/api/pipeline/smoke')  return handlePipelineSmoke(request, env, slug);
    if (method === 'GET'  && path === '/api/content/r2-list') return handleR2List(request, env, slug);
    if (method === 'POST' && path === '/api/content/ingest/menu')  return handleIngestMenu(request, env, ctx, slug);
    if (method === 'POST' && path === '/api/content/ingest/wine')  return handleIngestWine(request, env, ctx, slug);
    if (method === 'GET'  && path === '/api/content/search')       return handleContentSearch(request, env, slug);
    if (method === 'GET'  && path === '/api/content/documents')    return handleContentDocuments(request, env, slug);

    return j({ ok: false, error: 'not_found', path }, 404);
  }
};
