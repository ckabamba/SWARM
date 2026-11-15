import { useEffect, useRef, useState } from 'react'
import api from './api.js'
import { closeAccount, importResume, register, saveProfile, signIn, signOut, useAccount } from './account.js'
import { Switch } from './controls.jsx'

const MODES = [{ value: 'in', label: 'Sign in' }, { value: 'new', label: 'Create account' }]
const KINDS = [{ value: 'student', label: 'Student' }, { value: 'alum', label: 'Alum' }]
const VISIBILITY = [{ value: false, label: 'Private' }, { value: true, label: 'Public' }]
const SECTION_NAMES = { name: 'Name', major: 'Major', grad_year: 'Graduation year', contacts: 'Contact', experiences: 'Experience', courses: 'Course' }

/* One line that says what a resume suggestion would add. */
function describe(candidate) {
  const v = candidate.value
  if (typeof v !== 'object') return String(v)
  if (candidate.section === 'contacts') return v.value
  if (candidate.section === 'courses') return [v.code, v.title].filter(Boolean).join(' ')
  return [v.title, v.organization].filter(Boolean).join(', ')
}

function SignIn() {
  const [mode, setMode] = useState('in')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await (mode === 'new' ? register(form) : signIn({ email: form.email, password: form.password }))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>{mode === 'new' ? 'Create your account' : 'Sign in'}</h2>
      <p className="lede">An account lets you build your path history, contact alumni and post on Social Jackets. It lives on this WarmPath server, and your profile starts private.</p>
      <Switch label="Sign in or create an account" value={mode} onChange={(next) => { setMode(next); setError('') }} options={MODES} />
      <form className="form" onSubmit={submit}>
        {mode === 'new' && (
          <label><span className="cap">Name</span><input className="input" required maxLength={150} autoComplete="name" {...field('name')} /></label>
        )}
        <label><span className="cap">Email</span><input className="input" type="email" required maxLength={254} autoComplete="email" {...field('email')} /></label>
        <label>
          <span className="cap">Password</span>
          <input className="input" type="password" required minLength={12} maxLength={128} autoComplete={mode === 'new' ? 'new-password' : 'current-password'} {...field('password')} />
          {mode === 'new' && <span className="form-hint">12 characters or more.</span>}
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="pill hot" disabled={busy}>{mode === 'new' ? 'Create account' : 'Sign in'}</button>
      </form>
    </>
  )
}

function Resume({ onImported }) {
  const [draft, setDraft] = useState(null)        // the backend's draft: { id, candidates, warnings }
  const [picked, setPicked] = useState(new Set())
  const [resources, setResources] = useState([])
  useEffect(() => { let active=true; api.request('/profile-options').then(r=>{if(active)setResources(r.resources || [])}).catch(()=>{}); return ()=>{active=false} },[])
  const editCourse = (id, key, value) => setDraft(d => ({...d,candidates:d.candidates.map(c => c.id === id ? {...c,value:{...c.value,[key]:value}} : c)}))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)    // { text, error }
  const run = async (work) => {
    setBusy(true)
    setMessage(null)
    try { await work() } catch (failure) { setMessage({ text: failure.message, error: true }) } finally { setBusy(false) }
  }

  const upload = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    run(async () => { setDraft(await api.uploadResume(file)); setPicked(new Set()) })
  }
  const toggle = (id) => {
    const next = new Set(picked)
    if (!next.delete(id)) next.add(id)
    setPicked(next)
  }
  const add = () => run(async () => {
    const selections = draft.candidates.filter((c) => picked.has(c.id)).map((c) => ({ id: c.id, value: c.value }))
    const skipped = await importResume(draft.id, selections)
    const added = selections.length - skipped
    setDraft(null)
    setMessage({ text: `Added ${added} of ${selections.length}${skipped ? `; ${skipped} already saved` : ''}. Courses are saved to My Courses. New entries start private; review My history to confirm timing and sharing.` })
    onImported()
  })
  const discard = () => run(async () => { await api.discardResume(draft.id); setDraft(null) })

  return (
    <section className="panel-section">
      <h3 className="cap">Resume, optional</h3>
      {!draft ? (
        <>
          <p className="form-hint">Upload a PDF or DOCX and choose what to save. Courses go to My Courses; other entries go to your profile. The file itself is not kept.</p>
          <label className="pill file-pill" data-busy={busy}>
            {busy ? 'Reading the file' : 'Choose a file'}
            <input type="file" accept=".pdf,.docx" onChange={upload} disabled={busy} />
          </label>
        </>
      ) : (
        <>
          <p className="form-hint">
            {draft.candidates.length ? 'Nothing is added until you tick it. Check each one against your resume.' : 'Nothing could be read from this file. Try another, or fill in the profile by hand.'}
          </p>
          {draft.candidates.some(c => c.section === 'courses') && <><p className="form-hint">Review course codes and titles. Confirm optional catalog links; missing terms and institutions stay unknown.</p><button type="button" className="pill" disabled={busy} onClick={() => setPicked(new Set([...picked,...draft.candidates.filter(c=>c.section==='courses').map(c=>c.id)]))}>Select all courses</button></>}
          {draft.warnings?.map(w => <p className="form-hint" key={w}>{w}</p>)}
          <ul className="suggestions">
            {draft.candidates.map((candidate) => (
              <li key={candidate.id}>
                <label>
                  <input type="checkbox" checked={picked.has(candidate.id)} onChange={() => toggle(candidate.id)} />
                  <span>
                    <span className="cap">{SECTION_NAMES[candidate.section] || candidate.section}</span>
                    <b>{describe(candidate)}</b>
                    <span className="evidence">{candidate.evidence}</span>
                  </span>
                </label>
                {candidate.section === 'courses' && <fieldset className="form" disabled={busy}>
                  <legend className="cap">Review course</legend>
                  {[['code','Course code'],['title','Course title'],['institution','Institution'],['term','Term']].map(([key,label]) => <label key={key}><span>{label}</span><input className="input" maxLength={key==='code'?30:key==='term'?50:200} value={candidate.value[key] || ''} onChange={e=>editCourse(candidate.id,key,e.target.value)}/></label>)}
                  <label><span>Course status</span><select aria-label="Course status" className="input" value={candidate.value.status || 'unspecified'} onChange={e=>editCourse(candidate.id,'status',e.target.value)}>{['unspecified','planned','in_progress','taken','completed'].map(v=><option value={v} key={v}>{v.replace('_',' ')}</option>)}</select></label>
                  <label><span>Course resource (optional; confirm the match)</span><select aria-label="Course resource (optional; confirm the match)" className="input" value={candidate.value.resource_id || ''} onChange={e=>editCourse(candidate.id,'resource_id',e.target.value ? Number(e.target.value) : null)}><option value="">No linked resource</option>{resources.filter(r=>r.kind==='Course').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
                </fieldset>}
              </li>
            ))}
          </ul>
          <div className="acts">
            <button type="button" className="pill" onClick={discard} disabled={busy}>Discard</button>
            <button type="button" className="pill hot" onClick={add} disabled={busy || !picked.size}>Add {picked.size ? `${picked.size} ` : ''}selected entries</button>
          </div>
        </>
      )}
      {message && !message.error && <a className="pill" href="#/courses" onClick={closeAccount}>Open My Courses</a>}
      {message && <p className={message.error ? 'form-error' : 'form-hint'} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    </section>
  )
}

function Profile({ me }) {
  const [form, setForm] = useState(me.profile)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)          // { text, error }
  // A save or a resume import returns a newer profile; show it.
  useEffect(() => setForm(me.profile), [me.version])
  const change = (key, value) => { setForm({ ...form, [key]: value }); setNote(null) }
  const text = (key) => ({ value: form[key] ?? '', onChange: (e) => change(key, e.target.value) })

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await saveProfile({ ...form, grad_year: /^\d{4}$/.test(form.grad_year) ? Number(form.grad_year) : null, enrollment_year: /^\d{4}$/.test(form.enrollment_year) ? Number(form.enrollment_year) : null })
      setNote({ text: 'Saved. Review your history to choose which entries contribute to paths.' })
    } catch (failure) {
      setNote({ text: failure.message, error: true })
    } finally {
      setBusy(false)
    }
  }
  const leave = async () => {
    try { await signOut() } catch (failure) { setNote({ text: failure.message, error: true }) }
  }
  const entries = [...form.experiences, ...form.contacts]

  return (
    <>
      <h2>Your profile</h2>
      <p className="lede">Signed in as {me.email}.</p>
      <form className="form" onSubmit={save}>
        <label><span className="cap">Name</span><input className="input" required maxLength={150} autoComplete="name" {...text('name')} /></label>
        <div className="form-row">
          <span className="cap">I am a</span>
          <Switch label="Student or alum" value={form.kind} onChange={(kind) => change('kind', kind)} options={KINDS} />
        </div>
        <label><span className="cap">Major</span><input className="input" maxLength={200} {...text('major')} /></label>
        <label>
          <span className="cap">Graduation year</span>
          <input
            className="input" inputMode="numeric" pattern="(19|20)\d\d" maxLength={4} placeholder="2028"
            value={form.grad_year ?? ''} onChange={(e) => change('grad_year', e.target.value)}
          />
        </label>
        <label><span className="cap">First academic year began in</span><input className="input" type="number" min="1900" max="2100" value={form.enrollment_year ?? ''} onChange={e => change('enrollment_year', e.target.value)} /><span className="form-hint">Optional. Use your actual enrollment year; an individual history entry can specify its school year instead.</span></label>
        <label><span className="cap">Introduction</span><textarea className="input" maxLength={2000} {...text('introduction')} /></label>
        <div className="form-row">
          <span className="cap">Who can see this</span>
          <Switch label="Profile visibility" value={form.profile_visible} onChange={(visible) => change('profile_visible', visible)} options={VISIBILITY} />
          <span className="form-hint">
            {form.profile_visible
              ? 'Public shares your basic profile and allows posting. Only entries you explicitly share can contribute to public alumni paths; histories are self-reported.'
              : 'Only you can see a private profile. You need a public one to post.'}
          </span>
        </div>
        {note && <p className={note.error ? 'form-error' : 'form-hint'} role={note.error ? 'alert' : 'status'}>{note.text}</p>}
        <button className="pill hot" disabled={busy}>Save profile</button>
      </form>

      <div className="acts"><a className="pill" href="#/history" onClick={closeAccount}>Review history and experiences</a><a className="pill" href="#/courses" onClick={closeAccount}>My Courses</a></div>
      <Resume onImported={() => setNote(null)} />

      {entries.length > 0 && (
        <section className="panel-section">
          <h3 className="cap">Saved profile entries</h3>
          <ul className="entries">
            {form.experiences.map((entry) => <li key={entry.id}><b>{entry.title}</b>{entry.organization && <span>{entry.organization}</span>}</li>)}
            {form.contacts.map((entry) => <li key={entry.id}><b>{entry.value}</b><span>{entry.kind}</span></li>)}
          </ul>
        </section>
      )}

      <section className="panel-section">
        <button type="button" className="arrow-link cap" onClick={leave}>Sign out</button>
      </section>
    </>
  )
}

/* The right-edge drawer for the account: sign in or create one, then edit the profile and import a resume. */
export function AccountPanel() {
  const { status, me, open } = useAccount()
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const first = panel.current.querySelector('input, textarea')
    ;(first || panel.current.querySelector('button')).focus({ preventScroll: true })
    const key = (e) => { if (e.key === 'Escape') closeAccount() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, status])

  return (
    <aside className="panel account-panel" ref={panel} data-open={open} aria-hidden={!open} inert={!open} aria-label="Account">
      <button className="close cap" onClick={closeAccount}>Close</button>
      {status === 'in' ? <Profile me={me} /> : <SignIn />}
    </aside>
  )
}
