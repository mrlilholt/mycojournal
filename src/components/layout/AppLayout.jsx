import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import AccountModal from './AccountModal.jsx'
import LogFormModal from '../logs/LogFormModal.jsx'
import { useStore } from '../../store/store.jsx'

export default function AppLayout() {
  const { state } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [quickLogGrowId, setQuickLogGrowId] = useState('')
  const [quickLogOpen, setQuickLogOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const openQuickLog = (growId = '') => {
    setQuickLogGrowId(growId)
    setQuickLogOpen(true)
  }

  const closeQuickLog = () => {
    setQuickLogOpen(false)
    setQuickLogGrowId('')
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen ? <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} /> : null}
      <div className="app-main">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onQuickLog={() => openQuickLog('')}
          onToggleNav={() => setNavOpen((value) => !value)}
          onOpenAccount={() => setAccountOpen(true)}
          grows={state.grows}
        />
        <div className="app-content">
          <Outlet context={{ searchQuery, openQuickLog }} />
        </div>
      </div>
      <LogFormModal
        open={quickLogOpen}
        onClose={closeQuickLog}
        growId={quickLogGrowId}
        growOptions={state.grows}
      />
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  )
}
