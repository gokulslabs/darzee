import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { installApp, installState, subscribeInstall } from '../install.ts'
import { useSession } from '../state/Session.tsx'

const PLAN = 'Workshop'

export function SettingsPage() {
  const { unit, setUnit, theme, setTheme } = useSession()
  return (
    <section className="profile">
      <h1>Profile</h1>
      <div className="profile-head">
        <span className="avatar">S</span>
        <div>
          <b>Sridevi</b>
          <span className="lc-mark" aria-label="Ladies Collection">LC</span>
        </div>
      </div>
      <button type="button" className="profile-row" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
      <div className="profile-row">
        <span>Subscription</span>
        <b>{PLAN}</b>
      </div>
      <Link className="profile-row" to="/staff">Staff management</Link>
      <Link className="profile-row" to="/customers">Custom measurements</Link>
      <InstallRow />
      <div className="profile-row region">
        <div>
          <span>Regional preferences</span>
          <p className="muted">Currency INR</p>
        </div>
        <div className="seg">
          <button type="button" className={unit === 'inch' ? 'on' : ''} onClick={() => setUnit('inch')}>Inch</button>
          <button type="button" className={unit === 'cm' ? 'on' : ''} onClick={() => setUnit('cm')}>Cm</button>
        </div>
      </div>
      <button type="button" className="profile-row" onClick={() => {
        sessionStorage.clear()
        window.location.reload()
      }}>
        <span>Log out</span>
      </button>
    </section>
  )
}

function InstallRow() {
  const { offered, installed } = useSyncExternalStore(subscribeInstall, installState, installState)
  if (offered) {
    return (
      <button type="button" className="profile-row" onClick={() => void installApp()}>
        <span>Install app</span>
      </button>
    )
  }
  return (
    <div className="profile-row note">
      <span>Install app</span>
      <p className="muted">{installed ? 'Already installed on this device.' : 'This browser is not offering an install prompt.'}</p>
    </div>
  )
}
