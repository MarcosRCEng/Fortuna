import type { AppEvent } from "./AppEvent.js";

export interface EventHandler<TEvent extends AppEvent = AppEvent> {
  readonly name: string;
  readonly critical?: boolean;
  handle(event: TEvent): Promise<void>;
}
