import type { Provider } from "./index";

/** Names and role mappings belong to configuration, never to this registry. */
export class ProviderRegistry {
  private readonly providers = new Map<string, Provider>();
  register(name: string, provider: Provider): this {
    if (!name || name.trim() !== name || !provider || typeof provider.invoke !== "function") throw new Error("InvalidProviderRegistration");
    if (this.providers.has(name)) throw new Error("DuplicateProvider");
    this.providers.set(name, provider); return this;
  }
  resolve(config: unknown, role: string): Provider {
    if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("InvalidProviderConfig");
    const mapping = (config as Record<string, unknown>).providers;
    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) throw new Error("MissingProviderMapping");
    if (!Object.prototype.hasOwnProperty.call(mapping, role)) throw new Error("MissingProviderRole");
    const name = (mapping as Record<string, unknown>)[role];
    if (typeof name !== "string" || !name || name.trim() !== name) throw new Error("InvalidProviderName");
    const provider = this.providers.get(name);
    if (!provider) throw new Error("UnregisteredProvider");
    return provider;
  }
}
