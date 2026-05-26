export type AppEventPayload = Record<string, unknown>;

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  source: string;
  version: number;
}

export interface AppEvent<TPayload extends AppEventPayload = AppEventPayload> {
  id: string;
  type: string;
  playerId: string;
  occurredAt: Date;
  payload: TPayload;
  metadata: EventMetadata;
}

export type DomainEvent<TPayload extends AppEventPayload = AppEventPayload> =
  AppEvent<TPayload> & {
    metadata: EventMetadata & { source: "financial-domain" };
  };

export type ApplicationEvent<
  TPayload extends AppEventPayload = AppEventPayload,
> = AppEvent<TPayload> & {
  metadata: EventMetadata & { source: string };
};
