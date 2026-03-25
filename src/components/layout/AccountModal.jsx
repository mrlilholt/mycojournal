import { Link } from 'react-router-dom'
import Modal from '../ui/Modal.jsx'
import { useAuth } from '../../store/auth.jsx'
import { useStore } from '../../store/store.jsx'

export default function AccountModal({ open, onClose }) {
  const { user, signOut } = useAuth()
  const { state, actions } = useStore()
  const prefs = state.settings.uiPreferences || {}

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Account & Preferences"
      footer={
        <button
          className="ghost-btn"
          type="button"
          onClick={async () => {
            await signOut()
            onClose()
          }}
        >
          Sign out
        </button>
      }
    >
      <div className="account-modal">
        <div className="account-modal__header">
          {user?.photoURL ? <img className="account-modal__avatar" src={user.photoURL} alt={user.displayName || 'User'} /> : null}
          <div>
            <strong>{user?.displayName || 'MycoJournal User'}</strong>
            <div className="muted">{user?.email || ''}</div>
          </div>
        </div>

        <div className="panel">
          <h3>Display</h3>
          <div className="account-modal__controls">
            <button
              className={Boolean(prefs.compactCards) ? 'preference-chip is-active' : 'preference-chip'}
              type="button"
              onClick={() =>
                actions.updateSettings({
                  uiPreferences: {
                    ...prefs,
                    compactCards: !prefs.compactCards
                  }
                })
              }
            >
              <span className="preference-chip__indicator" />
              Compact grow cards
            </button>
            <button
              className={
                prefs.timelineExpandedDefault !== false ? 'preference-chip is-active' : 'preference-chip'
              }
              type="button"
              onClick={() =>
                actions.updateSettings({
                  uiPreferences: {
                    ...prefs,
                    timelineExpandedDefault: prefs.timelineExpandedDefault === false
                  }
                })
              }
            >
              <span className="preference-chip__indicator" />
              Expand latest timeline item
            </button>
          </div>
          <div className="account-modal__segmented">
            <button
              className={
                (prefs.defaultGalleryView || 'grow') === 'grow'
                  ? 'segmented-btn is-active'
                  : 'segmented-btn'
              }
              type="button"
              onClick={() =>
                actions.updateSettings({
                  uiPreferences: {
                    ...prefs,
                    defaultGalleryView: 'grow'
                  }
                })
              }
            >
              Gallery by grow
            </button>
            <button
              className={
                (prefs.defaultGalleryView || 'grow') === 'species'
                  ? 'segmented-btn is-active'
                  : 'segmented-btn'
              }
              type="button"
              onClick={() =>
                actions.updateSettings({
                  uiPreferences: {
                    ...prefs,
                    defaultGalleryView: 'species'
                  }
                })
              }
            >
              Gallery by species
            </button>
          </div>
        </div>

        <Link className="secondary-btn" to="/settings" onClick={onClose}>
          Open Full Settings
        </Link>
      </div>
    </Modal>
  )
}
