import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import {
  ActiveAssistantOAuthFlow,
  AssistantOAuthFlow,
  AssistantProviderStatus,
  PluginResponse,
  PluginsResponse,
  type AssistantOAuthFlow as OAuthFlow,
  type AssistantProviderStatus as ProviderStatus,
  type PluginInventoryItem as Plugin,
} from '@graphitemd/contracts'
import { readApiError, request, requestJson } from './api.js'
import './AssistantSettings.css'

export type { Plugin }
type SettingsArea = 'account' | 'assistant' | 'plugins'

function xsrfToken(): string {
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
  return value ? decodeURIComponent(value) : ''
}

const contributionLabels = {
  commands: 'Command', views: 'View', tools: 'Tool', routes: 'Route', events: 'Event', background: 'Background task',
} as const

function statusLabel(status: Plugin['status']) {
  return status.split('_').map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`).join(' ')
}

function AssistantSettings({ onSessionExpired, onAssistantChanged }: { onSessionExpired: () => void; onAssistantChanged?: () => void }) {
  const [provider, setProvider] = useState<ProviderStatus | null>(null)
  const [flow, setFlow] = useState<OAuthFlow | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const loadProvider = async () => {
    try {
      const response = await requestJson('/api/v1/assistant/provider', AssistantProviderStatus)
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setError('Codex authorization is unavailable.'); return }
      setProvider(response.data)
      if (response.data.status !== 'connecting') { setFlow(null); return }
      const activeFlow = await requestJson('/api/v1/assistant/oauth/active', ActiveAssistantOAuthFlow)
      if (activeFlow.status === 401) { onSessionExpired(); return }
      if (activeFlow.ok) setFlow(activeFlow.data)
      else setError('The existing Codex authorization flow could not be restored.')
    } catch { setError('Codex authorization is unavailable.') }
  }
  useEffect(() => { void loadProvider() }, [onSessionExpired])
  useEffect(() => {
    if (!flow || ['succeeded', 'failed', 'cancelled'].includes(flow.status)) return
    const poll = () => void requestJson(`/api/v1/assistant/oauth/${encodeURIComponent(flow.flowId)}`, AssistantOAuthFlow)
      .then((response) => {
        if (response.status === 401) { onSessionExpired(); return }
        if (response.ok) {
          if (['succeeded', 'failed', 'cancelled'].includes(response.data.status)) {
            setFlow(null); void loadProvider(); onAssistantChanged?.()
          } else setFlow(response.data)
        }
      })
    const interval = window.setInterval(poll, 1000)
    return () => window.clearInterval(interval)
  }, [flow, onSessionExpired, onAssistantChanged])
  const start = async () => {
    setPending(true); setError(null); setValue('')
    try {
      const response = await requestJson('/api/v1/assistant/oauth', AssistantOAuthFlow, {
        method: 'POST', headers: { 'x-xsrf-token': xsrfToken() },
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setError('Codex authorization could not be started.'); return }
      setFlow(response.data)
    } catch { setError('Codex authorization could not be started.') }
    finally { setPending(false) }
  }
  const answer = async (event: FormEvent) => {
    event.preventDefault()
    if (!flow) return
    const answerValue = flow.input?.kind === 'selection' && !value ? flow.input.options[0]?.id ?? '' : value
    setPending(true); setError(null)
    try {
      const response = await requestJson(`/api/v1/assistant/oauth/${encodeURIComponent(flow.flowId)}/answer`, AssistantOAuthFlow, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() }, body: JSON.stringify({ value: answerValue }),
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setError('That authorization input is no longer valid.'); return }
      setFlow(response.data); setValue('')
    } catch { setError('That authorization input is no longer valid.') }
    finally { setPending(false) }
  }
  const cancel = async () => {
    if (!flow) return
    setPending(true)
    try {
      const response = await requestJson(`/api/v1/assistant/oauth/${encodeURIComponent(flow.flowId)}/cancel`, AssistantOAuthFlow, {
        method: 'POST', headers: { 'x-xsrf-token': xsrfToken() },
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (response.ok) { setFlow(null); await loadProvider(); onAssistantChanged?.() } else setError('Codex authorization could not be cancelled.')
    } catch { setError('Codex authorization could not be cancelled.') }
    finally { setPending(false) }
  }
  const disconnect = async () => {
    setPending(true); setError(null)
    try {
      const response = await requestJson('/api/v1/assistant/disconnect', AssistantProviderStatus, {
        method: 'POST', headers: { 'x-xsrf-token': xsrfToken() },
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setError('Codex could not be disconnected.'); return }
      setProvider(response.data); setFlow(null)
      onAssistantChanged?.()
    } catch { setError('Codex could not be disconnected.') }
    finally { setPending(false) }
  }
  const input = flow?.input
  const selectedOption = input?.kind === 'selection'
    ? input.options.find((option) => option.id === value) ?? input.options[0]
    : undefined
  const status = flow && !['succeeded', 'failed', 'cancelled'].includes(flow.status) ? 'connecting' : provider?.status
  return <section id="settings-panel-assistant" role="tabpanel" aria-labelledby="settings-tab-assistant"><p className="panel-label">Assistant</p><h2>OpenAI Codex</h2>
    <p aria-live="polite">{status ? `Status: ${status}.` : 'Checking Codex status…'}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {provider?.status !== 'connected' && !flow && <button className="primary-button" type="button" disabled={pending} onClick={() => void start()}>{pending ? 'Starting…' : 'Connect Codex'}</button>}
    {flow && <div className="settings-form" aria-live="polite"><p>Authorization status: {flow.status.replaceAll('_', ' ')}.</p>
      {flow.authorization && <p className="oauth-browser-login">{flow.authorization.instructions ?? 'Complete login in your browser.'} <a href={flow.authorization.url} target="_blank" rel="noreferrer">Open secure OpenAI login</a></p>}
      {input?.kind === 'device_code' && <p>Open <a href={input.verificationUri} target="_blank" rel="noreferrer">Codex device authorization</a> and enter code <strong>{input.userCode}</strong>.</p>}
      {input?.kind === 'selection' && <form className="oauth-selection-form" onSubmit={(event) => void answer(event)}>
        <fieldset>
          <legend>Choose how to connect</legend>
          <p id="oauth-selection-help" className="oauth-selection-help">You’ll complete authorization in Codex.</p>
          <div className="oauth-option-list" aria-describedby="oauth-selection-help">
            {input.options.map((option) => <label className={`oauth-option${selectedOption?.id === option.id ? ' selected' : ''}`} key={option.id}>
              <input type="radio" name="oauth-selection" value={option.id} checked={selectedOption?.id === option.id} onChange={() => setValue(option.id)} required />
              <span>{option.label}</span>
            </label>)}
          </div>
        </fieldset>
        <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Continuing…' : `Continue with ${selectedOption?.label ?? 'selected option'}`}</button>
      </form>}
      {input?.kind === 'text' && <form onSubmit={(event) => void answer(event)}><label htmlFor="oauth-input">{input.label}</label><input id="oauth-input" type={input.secret ? 'password' : 'text'} value={value} onChange={(event) => setValue(event.target.value)} required={input.required} /><button type="submit" disabled={pending}>{pending ? 'Continuing…' : 'Continue'}</button></form>}
      {!['succeeded', 'failed', 'cancelled'].includes(flow.status) && <button className="secondary-button oauth-cancel-button" type="button" disabled={pending} onClick={() => void cancel()}>Cancel connection</button>}
      {flow.error && <p className="form-error" role="alert">{flow.error.message}</p>}
    </div>}
    {provider?.status === 'connected' && <button className="secondary-button" type="button" disabled={pending} onClick={() => void disconnect()}>Disconnect Codex</button>}
  </section>
}

export function SettingsPanel({ onSessionExpired, onPluginsChanged, onAssistantChanged, onLogout }: { onSessionExpired: () => void; onPluginsChanged?: () => void; onAssistantChanged?: () => void; onLogout?: () => void }) {
  const [area, setArea] = useState<SettingsArea>('account')
  const [plugins, setPlugins] = useState<Plugin[] | null>(null)
  const [pluginError, setPluginError] = useState<string | null>(null)
  const [changingPlugin, setChangingPlugin] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [horizontalTabs, setHorizontalTabs] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 60rem)')
    const update = () => setHorizontalTabs(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let active = true
    void requestJson('/api/v1/plugins', PluginsResponse).then((response) => {
      if (!active) return
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setPluginError('Plugin status is unavailable.'); return }
      setPlugins(response.data.plugins)
    }).catch(() => { if (active) setPluginError('Plugin status is unavailable.') })
    return () => { active = false }
  }, [onPluginsChanged, onSessionExpired])

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setPasswordError(null)
    if (password !== confirmation) { setPasswordError('New passwords do not match.'); return }
    setChangingPassword(true)
    try {
      const response = await request('/api/v1/auth/password', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
        body: JSON.stringify({ currentPassword, password }),
      })
      if (response.status === 204 || response.status === 401) {
        if (response.status === 204) {
          setCurrentPassword(''); setPassword(''); setConfirmation(''); onSessionExpired()
        } else {
          const result = await readApiError(response)
          if (result?.error?.code === 'unauthenticated') onSessionExpired()
          else setPasswordError('The current password was not accepted.')
        }
        return
      }
      setPasswordError('The password could not be changed.')
    } catch { setPasswordError('The password could not be changed.') }
    finally { setChangingPassword(false) }
  }

  async function setEnabled(plugin: Plugin, enabled: boolean) {
    setChangingPlugin(plugin.id); setPluginError(null)
    try {
      const response = await requestJson(`/api/v1/plugins/${encodeURIComponent(plugin.id)}`, PluginResponse, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
        body: JSON.stringify({ enabled }),
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setPluginError(`GraphiteMD could not ${enabled ? 'enable' : 'disable'} ${plugin.manifest?.name ?? plugin.id}.`); return }
      setPlugins((current) => current?.map((item) => item.id === response.data.plugin.id ? response.data.plugin : item) ?? null)
      onPluginsChanged?.()
    } catch { setPluginError(`GraphiteMD could not ${enabled ? 'enable' : 'disable'} ${plugin.manifest?.name ?? plugin.id}.`) }
    finally { setChangingPlugin(null) }
  }

  function navigateAreas(event: KeyboardEvent<HTMLButtonElement>, current: SettingsArea) {
    const areas: SettingsArea[] = ['account', 'assistant', 'plugins']
    const index = areas.indexOf(current)
    let next: SettingsArea | undefined
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = areas[(index + 1) % areas.length]
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = areas[(index - 1 + areas.length) % areas.length]
    else if (event.key === 'Home') next = areas[0]
    else if (event.key === 'End') next = areas.at(-1)
    if (!next) return
    event.preventDefault()
    setArea(next)
    queueMicrotask(() => document.getElementById(`settings-tab-${next}`)?.focus())
  }

  return <div className="settings-panel">
    <nav className="settings-navigation" aria-label="Settings areas" role="tablist" aria-orientation={horizontalTabs ? 'horizontal' : 'vertical'}>
      <button id="settings-tab-account" type="button" role="tab" aria-selected={area === 'account'} aria-controls="settings-panel-account" tabIndex={area === 'account' ? 0 : -1} onClick={() => setArea('account')} onKeyDown={(event) => navigateAreas(event, 'account')}>Account</button>
      <button id="settings-tab-assistant" type="button" role="tab" aria-selected={area === 'assistant'} aria-controls="settings-panel-assistant" tabIndex={area === 'assistant' ? 0 : -1} onClick={() => setArea('assistant')} onKeyDown={(event) => navigateAreas(event, 'assistant')}>Assistant</button>
      <button id="settings-tab-plugins" type="button" role="tab" aria-selected={area === 'plugins'} aria-controls="settings-panel-plugins" tabIndex={area === 'plugins' ? 0 : -1} onClick={() => setArea('plugins')} onKeyDown={(event) => navigateAreas(event, 'plugins')}>Plugins</button>
    </nav>
    <div className="settings-content">
    {area === 'account' && <section id="settings-panel-account" role="tabpanel" aria-labelledby="settings-tab-account"><p className="panel-label">Account</p><h2 id="account-settings">Change password</h2>
      <p>Changing the owner password signs out every browser session.</p>
      <form name="change-password" className="settings-form" onSubmit={(event) => void changePassword(event)}>
        <label htmlFor="current-password">Current password</label><input id="current-password" name="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <label htmlFor="new-password">New password</label><input id="new-password" name="new-password" type="password" autoComplete="new-password" aria-describedby="password-guidance" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <p id="password-guidance" className="field-guidance">Use a long, unique passphrase that you can remember.</p>
        <label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
        <button className="primary-button" type="submit" disabled={changingPassword}>{changingPassword ? 'Changing password…' : 'Change password'}</button>
      </form>
      {onLogout && <button className="secondary-button" type="button" onClick={onLogout}>Log out</button>}
    </section>}
    {area === 'assistant' && <AssistantSettings onSessionExpired={onSessionExpired} {...(onAssistantChanged ? { onAssistantChanged } : {})} />}
    {area === 'plugins' && <section id="settings-panel-plugins" role="tabpanel" aria-labelledby="settings-tab-plugins"><p className="panel-label">Extensions</p><h2 id="plugin-settings">Bundled plugins</h2>
      <p>Inspect what each plugin can access and which contributions are currently active.</p>
      {pluginError && <p className="form-error" role="alert">{pluginError}</p>}
      {plugins === null && !pluginError ? <p aria-live="polite">Loading plugins…</p> : plugins?.length === 0 ? <p>No bundled plugins are available.</p> : <div className="plugin-list">{plugins?.map((plugin) => {
        const name = plugin.manifest?.name ?? plugin.id
        const contributions = Object.entries(plugin.contributions).flatMap(([kind, entries]) => (entries ?? []).map((entry) => `${contributionLabels[kind as keyof typeof contributionLabels]}: ${entry.title}`))
        const controllable = plugin.status === 'active' || plugin.status === 'disabled'
        return <article className="plugin-card" aria-label={`${name} plugin`} key={plugin.id}>
          <header><div><h3>{name}</h3><p>{plugin.manifest ? `Version ${plugin.manifest.version}` : plugin.id}</p></div><span className={`plugin-status ${plugin.status}`}>{statusLabel(plugin.status)}</span></header>
          {plugin.message && <p className="form-error">{plugin.message}</p>}
          <p className="plugin-detail"><strong>Permissions</strong>{plugin.manifest?.permissions.length ? plugin.manifest.permissions.join(', ') : 'None'}</p>
          <div className="plugin-contributions"><strong>Active contributions</strong>{contributions.length ? <ul>{contributions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No active contributions.</p>}</div>
          {controllable && <button type="button" disabled={changingPlugin === plugin.id} onClick={() => void setEnabled(plugin, plugin.status === 'disabled')}>{changingPlugin === plugin.id ? 'Updating…' : `${plugin.status === 'active' ? 'Disable' : 'Enable'} ${name}`}</button>}
        </article>
      })}</div>}
    </section>}
    </div>
  </div>
}
