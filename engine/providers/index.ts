/** No provider selection, network call, retry, credential handling or cost policy in WP-000. */
export interface ProviderRequest {
  operation: string;
  model: string;
  input: Readonly<Record<string, unknown>>;
  promptVersion?: string;
  temperature?: number;
  seed?: number | string;
  idempotencyKey: string;
}

export interface ProviderResult {
  output: unknown;
  providerRequestId: string;
  model: string;
  costUsd: number;
  costKind: "estimated" | "actual";
}

export interface Provider { invoke(request: ProviderRequest): Promise<ProviderResult>; }

export class UnimplementedProvider implements Provider {
  async invoke(_request: ProviderRequest): Promise<ProviderResult> { throw new Error("NotImplemented"); }
}
