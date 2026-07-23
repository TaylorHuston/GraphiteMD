export type RuntimeEnvironment = Record<string, string | undefined>

/** Canonical presence wins, including values that later validation rejects. */
export function anthraciteEnvironmentValue(
  environment: RuntimeEnvironment,
  name: string,
): string | undefined {
  const canonical = `ANTHRACITEMD_${name}`
  if (Object.prototype.hasOwnProperty.call(environment, canonical)) return environment[canonical]
  return environment[`GRAPHITEMD_${name}`]
}

export function assistantTestRuntimeEnabled(environment: RuntimeEnvironment): boolean {
  const configured = anthraciteEnvironmentValue(environment, 'ASSISTANT_TEST_RUNTIME')
  if (configured === undefined) return false
  if (configured !== 'grounded') {
    throw new Error('ANTHRACITEMD_ASSISTANT_TEST_RUNTIME must be grounded when configured')
  }
  return true
}
