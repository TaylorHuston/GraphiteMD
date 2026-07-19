type Attempt = { failures: number; blockedUntil: number }

export class LoginAttemptLimiter {
  readonly #attempts = new Map<string, Attempt>()

  constructor(
    private readonly maximumFailures = 5,
    private readonly blockMilliseconds = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  allows(source: string): boolean {
    const attempt = this.#attempts.get(source)
    if (!attempt) return true
    if (attempt.blockedUntil <= this.now()) {
      this.#attempts.delete(source)
      return true
    }
    return attempt.failures < this.maximumFailures
  }

  failed(source: string): void {
    const previous = this.#attempts.get(source)
    const failures = (previous?.failures ?? 0) + 1
    this.#attempts.set(source, {
      failures,
      blockedUntil: failures >= this.maximumFailures ? this.now() + this.blockMilliseconds : Number.POSITIVE_INFINITY,
    })
  }

  succeeded(source: string): void {
    this.#attempts.delete(source)
  }
}
