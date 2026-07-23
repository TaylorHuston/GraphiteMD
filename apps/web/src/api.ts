import {
  ErrorResponse,
  matchesContract,
  type ErrorResponse as ApiError,
  type RuntimeSchema,
  type SchemaValue,
} from '@anthracitemd/contracts'

export class InvalidApiResponseError extends Error {
  constructor(readonly path: string) {
    super(`AnthraciteMD received an invalid response from ${path}.`)
    this.name = 'InvalidApiResponseError'
  }
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T; response: Response }
  | { ok: false; status: number; response: Response }

export async function requestJson<const Schema extends RuntimeSchema>(path: string, schema: Schema, init?: RequestInit): Promise<ApiResult<SchemaValue<Schema>>> {
  const response = await fetch(path, { ...init, credentials: 'same-origin' })
  if (!response.ok) return { ok: false, status: response.status, response }
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new InvalidApiResponseError(path)
  }
  if (!matchesContract(schema, data)) throw new InvalidApiResponseError(path)
  return { ok: true, status: response.status, data, response }
}

export async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, { ...init, credentials: 'same-origin' })
}

export async function readApiError(response: Response): Promise<ApiError | undefined> {
  try {
    const value: unknown = await response.json()
    return matchesContract(ErrorResponse, value) ? value as ApiError : undefined
  } catch {
    return undefined
  }
}
