import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  PluginResponse,
  PluginsResponse,
  type PluginInventoryItem as Plugin,
} from '@graphitemd/contracts'
import { readApiError, request, requestJson } from './api.js'

export type { Plugin }

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

export function SettingsPanel({ onSessionExpired, onPluginsChanged, onLogout }: { onSessionExpired: () => void; onPluginsChanged?: () => void; onLogout?: () => void }) {
  const [plugins, setPlugins] = useState<Plugin[] | null>(null)
  const [pluginError, setPluginError] = useState<string | null>(null)
  const [changingPlugin, setChangingPlugin] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

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

  return <div className="settings-panel">
    <section aria-labelledby="account-settings"><p className="panel-label">Account</p><h2 id="account-settings">Change password</h2>
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
    </section>
    <section aria-labelledby="plugin-settings"><p className="panel-label">Extensions</p><h2 id="plugin-settings">Bundled plugins</h2>
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
    </section>
  </div>
}
