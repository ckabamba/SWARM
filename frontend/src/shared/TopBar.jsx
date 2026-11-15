import { useEffect, useRef, useState } from 'react'
import api from './fake-api.js'
import { loadAccount, openAccount, signOut, useAccount } from './account.js'
import { AccountPanel } from './AccountPanel.jsx'
import { Avatar, Switch } from './controls.jsx'
import { CloseIcon, HexIcon, HiveIcon, SearchIcon } from './icons.jsx'
import { setTheme, useTheme } from './theme.js'
import './shell.css'

const THEMES = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]

/*
 * The bar every signed-in page shares: wordmark, an optional search field, section links and the account button.
 * `search` is { value, onChange, placeholder, label }; leave it out on pages with nothing to search.
 */
export function TopBar({ active, onHome, students, studentId, onStudent, search }) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const account = useRef(null)
  const student = students.find((s) => s.id === studentId)
  // Who the account button stands for: the signed-in account, nobody, or (on fixtures) the demo student.
  const { status, me } = useAccount()
  useEffect(loadAccount, [])
  const real = status === 'in' ? me.profile : null
  const demo = status === 'demo'
  const name = real ? real.name : demo ? student.name : null
  const standing = real ? me.email : demo ? `${student.major} · ${api.ordinal(student.school_year)} year` : 'Sign in to post on Social Jackets'
  const showAccount = () => { setOpen(false); openAccount() }

  useEffect(() => {
    if (!open) return undefined
    const down = (e) => { if (!account.current.contains(e.target)) setOpen(false) }
    const key = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      account.current.querySelector('button').focus()
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key) }
  }, [open])

  return (
    <>
    <header className="topbar">
      <a className="mark" href="#" onClick={onHome} aria-label="WarmPath home"><i />WarmPath</a>

      {search && (
        <label className="search">
          <SearchIcon />
          <input type="search" value={search.value} onChange={(e) => search.onChange(e.target.value)} placeholder={search.placeholder} aria-label={search.label} autoComplete="off" spellCheck="false" />
          {search.value && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => search.onChange('')}><CloseIcon /></button>
          )}
        </label>
      )}

      <span className="topbar-space" />

      <nav className="topnav cap" aria-label="WarmPath sections">
        <a href="#" onClick={onHome} aria-current={active === 'path' ? 'page' : undefined}><HexIcon filled={active === 'path'} /><span>Home</span></a>
        <a href="#/community" aria-current={active === 'community' ? 'page' : undefined}><HiveIcon /><span>Social Jackets</span></a>
      </nav>

      <div className="account" data-open={open} ref={account}>
        <button className="account-button" aria-expanded={open} aria-controls="account-menu" aria-label={`Account: ${name || 'not signed in'}`} onClick={() => setOpen(!open)}>
          <Avatar name={name} ring />
        </button>
        <div className="account-menu" id="account-menu" inert={!open}>
          <div className="account-id">
            <Avatar name={name} ring />
            <div>
              <b>{name || 'Not signed in'}</b>
              <span>{standing}</span>
            </div>
          </div>
          {demo ? (
            <p className="account-note">Demo student. The profiles in WarmPath are invented for now.</p>
          ) : (
            <div className="account-acts">
              <button className={real ? 'pill' : 'pill hot'} onClick={showAccount}>{real ? 'Edit profile' : 'Sign in or create an account'}</button>
              {real && <button className="arrow-link cap" onClick={() => signOut().catch(() => {})}>Sign out</button>}
            </div>
          )}
          <div className="menu-row">
            <span className="cap">{demo ? 'Viewing as' : 'Path map demo student'}</span>
            <Switch label="Demo student" value={studentId} onChange={onStudent} options={students.map((s) => ({ value: s.id, label: s.name }))} />
          </div>
          <div className="menu-row">
            <span className="cap">Theme</span>
            <Switch label="Colour theme" value={theme} onChange={setTheme} options={THEMES} />
          </div>
        </div>
      </div>
    </header>
    {!demo && <AccountPanel />}
    </>
  )
}
