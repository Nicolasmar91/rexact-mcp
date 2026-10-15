// Interface minimale injectée par l'appelant : implémentation en mémoire ici,
// en Postgres côté apps/web (voir table redos_cache, annexe A).
export interface Cache<T> {
  get(key: string): Promise<T | undefined> | T | undefined;
  set(key: string, value: T): Promise<void> | void;
}

export class InMemoryCache<T> implements Cache<T> {
  private readonly store = new Map<string, T>();

  get(key: string): T | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T): void {
    this.store.set(key, value);
  }
}
