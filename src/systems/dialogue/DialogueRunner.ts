import { DIALOGUE } from '../../data/dialogue';
import type { DialoguePage } from '../../types';

export class DialogueRunner {
  readonly pages: DialoguePage[];
  index = 0;

  constructor(dialogueId: string) {
    this.pages = DIALOGUE[dialogueId]?.pages ?? [{ text: '...' }];
  }

  current(): DialoguePage {
    return this.pages[this.index];
  }

  advance(): boolean {
    if (this.index < this.pages.length - 1) {
      this.index += 1;
      return true;
    }
    return false;
  }
}

