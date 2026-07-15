interface ScheduledEvent<T> {
  at: string
  priority: number
  sequence: number
  value: T
}

export interface VirtualActionContext {
  now: string
  schedule(at: string, priority: number, action: VirtualAction): void
}

export type VirtualAction = (context: VirtualActionContext) => void

/** Deterministic virtual-time queue. Higher policy priority wins only at the same instant. */
export class VirtualEventQueue<T> {
  readonly #items: ScheduledEvent<T>[] = []
  #sequence = 0

  get size(): number {
    return this.#items.length
  }

  schedule(at: string, priority: number, value: T): void {
    this.#items.push({ at, priority, sequence: this.#sequence++, value })
  }

  popNextUntil(observationEnd: string): { at: string; value: T } | undefined {
    this.#items.sort(
      (left, right) =>
        left.at.localeCompare(right.at) ||
        right.priority - left.priority ||
        left.sequence - right.sequence,
    )
    if (this.#items.length === 0 || this.#items[0]!.at > observationEnd)
      return undefined
    const item = this.#items.shift()!
    return { at: item.at, value: item.value }
  }

  drainUntil(observationEnd: string): T[] {
    const consumed: T[] = []
    let item = this.popNextUntil(observationEnd)
    while (item) {
      consumed.push(item.value)
      item = this.popNextUntil(observationEnd)
    }
    return consumed
  }
}

/** Re-entrant causal runner: actions may schedule later actions while the clock advances. */
export class CausalEventQueue {
  readonly #queue = new VirtualEventQueue<VirtualAction>()
  #currentNow: string | undefined

  get size(): number {
    return this.#queue.size
  }

  schedule(at: string, priority: number, action: VirtualAction): void {
    if (this.#currentNow && at < this.#currentNow)
      throw new Error(
        `Cannot schedule virtual action in the past: ${at} < ${this.#currentNow}`,
      )
    this.#queue.schedule(at, priority, action)
  }

  runUntil(observationEnd: string): void {
    let next = this.#queue.popNextUntil(observationEnd)
    while (next) {
      this.#currentNow = next.at
      next.value({
        now: next.at,
        schedule: (at, priority, action) => this.schedule(at, priority, action),
      })
      next = this.#queue.popNextUntil(observationEnd)
    }
  }
}

export function materializeByVirtualTime<T>(
  items: readonly T[],
  at: (item: T) => string,
  observationEnd: string,
  priority: (item: T) => number = () => 0,
): T[] {
  const queue = new VirtualEventQueue<T>()
  for (const item of items) queue.schedule(at(item), priority(item), item)
  return queue.drainUntil(observationEnd)
}
