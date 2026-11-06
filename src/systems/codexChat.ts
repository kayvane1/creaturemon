import type { CodexChatMode } from '../data/codexChat';
import { GameState } from '../state/GameState';

const CHAT_FETCH_TIMEOUT_MS = 11_000;

export interface CodexChatGift {
  id: string;
  displayName: string;
  description: string;
  reason: string;
}

export interface CodexChatRequest {
  mode: CodexChatMode;
  conversationId: string;
  message: string;
  npcId?: string;
  playerName: string;
  map: string;
  party: string[];
  inventory: Record<string, number>;
  flags: Record<string, boolean>;
}

export interface CodexChatResponse {
  ok: boolean;
  fallback?: boolean;
  source?: 'instant' | 'codex' | 'fallback';
  latencyMs?: number;
  conversationId: string;
  threadId?: string;
  speaker: string;
  reply: string;
  gift: CodexChatGift | null;
  error?: string;
}

export async function sendCodexChat(request: Pick<CodexChatRequest, 'mode' | 'conversationId' | 'message' | 'npcId'>): Promise<CodexChatResponse> {
  const payload: CodexChatRequest = {
    ...request,
    playerName: GameState.playerName,
    map: GameState.map,
    party: GameState.party.map((mon) => mon.species_id),
    inventory: GameState.inventory,
    flags: GameState.flags,
  };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CHAT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch('/api/codex-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await response.json()) as CodexChatResponse;
    if (!response.ok || !data.ok) throw new Error(data.error ?? 'Codex chat failed.');
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The signal timed out. Try a shorter message.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
