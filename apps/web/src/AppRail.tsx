import { FileText, Plus, Search, Settings, SlidersHorizontal } from 'lucide-react'

type AppRailProps = {
  onOpenFiles: () => void
  onOpenSearch: () => void
  onOpenContext: () => void
  onOpenSettings: () => void
}

export function AppRail({ onOpenFiles, onOpenSearch, onOpenContext, onOpenSettings }: AppRailProps) {
  return <nav className="app-rail" aria-label="App switcher">
    <div className="app-rail-list">
      <div className="rail-brand" aria-label="GraphiteMD" title="GraphiteMD">G</div>
      <button className="rail-item" data-active="true" data-testid="mobile-files" type="button" aria-label="Files" aria-current="page" title="Files" onClick={onOpenFiles}><FileText size={19} aria-hidden="true" /></button>
      <button className="rail-item" type="button" aria-label="Search" title="Search" onClick={onOpenSearch}><Search size={19} aria-hidden="true" /></button>
      <button className="rail-item" type="button" aria-label="Context" title="Context" onClick={onOpenContext}><SlidersHorizontal size={19} aria-hidden="true" /></button>
      <button className="rail-item" type="button" disabled aria-label="Add plugin, coming later" title="Add plugin (coming later)"><Plus size={19} aria-hidden="true" /></button>
    </div>
    <button className="rail-item" type="button" aria-label="Settings" title="Settings" onClick={onOpenSettings}><Settings size={19} aria-hidden="true" /></button>
  </nav>
}
