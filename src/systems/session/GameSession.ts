import { CODEX_GIFTS } from '../../data/codexChat';
import { GameState } from '../../state/GameState';
import type { BattleRequest, BattleResult, Direction } from '../../types';
import { loadGame, saveGame } from '../save';
import { handleStoryEvent, type StoryOutcome } from '../scripts/story';

export interface NewGameRequest {
  playerName: string;
  rivalName: string;
}

export interface WorldPosition {
  map: string;
  x: number;
  y: number;
  facing: Direction;
}

export interface CodexGiftRequest {
  id: string;
}

export type WorldEntryEffect = { type: 'dialogue'; dialogueId: string };

let pendingWorldEntryEffects: WorldEntryEffect[] = [];

export class GameSession {
  static newGame({ playerName, rivalName }: NewGameRequest): void {
    GameState.reset();
    GameState.playerName = playerName;
    GameState.rivalName = rivalName;
    pendingWorldEntryEffects = [];
  }

  static continueGame(): boolean {
    pendingWorldEntryEffects = [];
    return loadGame();
  }

  static commitWorldPosition(position: WorldPosition): void {
    GameState.setPosition(position.map, position.x, position.y, position.facing);
    if (GameState.party.length > 0) saveGame();
  }

  static beginBattle(request: BattleRequest): void {
    GameState.pendingBattle = request;
    GameState.setPosition(request.returnMap, request.returnX, request.returnY, request.returnFacing);
  }

  static finishBattle(outcome: BattleResult['outcome']): BattleResult | null {
    const request = GameState.pendingBattle;
    if (!request) return null;

    this.applyStoryOutcome(
      handleStoryEvent(
        { type: 'battleFinished', outcome, request },
        { map: GameState.map, flags: GameState.flags, rivalName: GameState.rivalName, rivalStarter: GameState.rivalStarter },
      ),
    );
    if (outcome === 'win' && request.onWinStory) {
      this.applyStoryOutcome(
        handleStoryEvent(
          { type: 'stepTriggerEntered', triggerId: request.onWinStory },
          { map: GameState.map, flags: GameState.flags, rivalName: GameState.rivalName, rivalStarter: GameState.rivalStarter },
        ),
      );
    }
    if (outcome === 'loss' && request.onLoseStory) {
      this.applyStoryOutcome(
        handleStoryEvent(
          { type: 'stepTriggerEntered', triggerId: request.onLoseStory },
          { map: GameState.map, flags: GameState.flags, rivalName: GameState.rivalName, rivalStarter: GameState.rivalStarter },
        ),
      );
    }

    GameState.setPosition(request.returnMap, request.returnX, request.returnY, request.returnFacing);
    GameState.pendingBattle = null;
    const result: BattleResult = { outcome, kind: request.kind };
    saveGame();
    return result;
  }

  static saveFromMenu(position: WorldPosition): void {
    GameState.setPosition(position.map, position.x, position.y, position.facing);
    saveGame();
  }

  static acceptCodexGift(gift: CodexGiftRequest | null): boolean {
    if (!gift || !CODEX_GIFTS[gift.id]) return false;
    if (GameState.itemCount(gift.id) > 0) return false;
    GameState.giveItem(gift.id);
    saveGame();
    return true;
  }

  static consumeWorldEntryEffects(): WorldEntryEffect[] {
    const effects = pendingWorldEntryEffects;
    pendingWorldEntryEffects = [];
    return effects;
  }

  private static applyStoryOutcome(outcome: StoryOutcome): void {
    for (const mutation of outcome.setFlags) GameState.setFlag(mutation.flag, mutation.value ?? true);
    if (outcome.showDialogue) pendingWorldEntryEffects.push({ type: 'dialogue', dialogueId: outcome.showDialogue.dialogueId });
  }
}
