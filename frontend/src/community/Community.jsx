import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import api from '../shared/fake-api.js'
import { REDUCED } from '../shared/motion.js'
import { Backdrop } from '../shared/Backdrop.jsx'
import { TopBar } from '../shared/TopBar.jsx'
import { openAccount, useAccount } from '../shared/account.js'
import { Arrow, Avatar, Switch } from '../shared/controls.jsx'
import { HexIcon, hexPoints } from '../shared/icons.jsx'
import { useViewport } from '../map/layout.js'
import { Swarm } from '../map/Swarm.jsx'
import { CLUBS, EVENTS, PROFILES, RECORDS, addSessionPost, formatPostTime, isSessionPost, loadCommunity, loadProfile, loadResourceLinks, publishPost, reloadCommunity, useCommunity } from './data.js'
import { Bee } from './Bee.jsx'
import { Details } from './Details.jsx'
import './community.css'

const VIEWS = [{ value: 'posts', label: 'Posts' }, { value: 'campus', label: 'Events and clubs' }]
const POST_LIMIT = 420
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`

/* The student's path stops as one row of the comb: gold cells are stops they have, the dashed cell is next. */
function PathComb({ stops }) {
  const r = 13, dx = 1.5 * r, dy = (Math.sqrt(3) / 2) * r
  const w = 2 * r + dx * (stops.length - 1) + 2, h = 3 * dy + 2
  return (
    <svg className="comb" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      {stops.map((stop, i) => (
        <polygon key={stop.activity_id} points={hexPoints(1 + r + i * dx, 1 + dy + (i % 2) * dy, r)} data-have={stop.have} data-next={stop.next} />
      ))}
    </svg>
  )
}

function Post({ post, index, onProfile, onRecord }) {
  const author = PROFILES[post.authorId]
  const record = post.linkedRecordId && RECORDS.get(post.linkedRecordId)
  return (
    <article className="card post" style={{ '--i': Math.min(index, 6) }}>
      <header>
        <Avatar name={author.name} />
        <div>
          <button className="post-author" onClick={() => onProfile(author.id)}>{author.name}</button>
          <span className="post-meta">
            {author.major}, {author.year} · <time dateTime={post.createdAt}>{formatPostTime(post.createdAt)}</time>
          </span>
        </div>
        {isSessionPost(post) && <span className="cap post-flag">This tab only</span>}
      </header>
      <p className="post-text">{post.text}</p>
      {record && (
        <button className="record" onClick={() => onRecord(record.id)}>
          <HexIcon />
          <span><span className="cap">{record.type}</span>{record.title}</span>
          <Arrow />
        </button>
      )}
    </article>
  )
}

export function Community({ students, studentId, onStudent }) {
  // Posts and events come from the data layer, which reads fixtures or the backend. See data.js.
  const { posts, events, links, loading, note } = useCommunity()
  useEffect(loadCommunity, [])
  const [query, setQuery] = useState('')
  const [view, setView] = useState('posts')       // where the switch points
  const [shown, setShown] = useState('posts')     // what is on screen; trails `view` while the old list leaves
  const [detail, setDetail] = useState(null)      // { kind: 'profile' | 'record', id } or null
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [linked, setLinked] = useState('')
  const [push, setPush] = useState(null)          // a bee push in progress: { id, from, dir, y }, or null
  const [arrival, setArrival] = useState('slide') // how the list on screen came in: 'slide' or 'push'
  const draftInput = useRef(null), opener = useRef(null), stage = useRef(null)
  const viewport = useViewport()

  const me = PROFILES[`person:${studentId}`]      // the demo student, used while nobody can sign in
  // With the backend connected, the card and composer belong to the signed-in account instead.
  const account = useAccount()
  const demo = account.status === 'demo'
  const real = account.status === 'in' ? account.me.profile : null
  const myName = real ? real.name : demo ? me.name : null
  const canPost = demo || Boolean(real && real.profile_visible)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const version = account.me && account.me.version
  const lastVersion = useRef(version)
  useEffect(() => {
    if (real) loadResourceLinks()
    // A saved profile can change your name on your own posts, so read the feed again.
    if (version && lastVersion.current && version !== lastVersion.current) reloadCommunity()
    lastVersion.current = version
  }, [version])
  const path = useMemo(() => api.postPath({ goal: api.SEEDED_GOALS[0], student_id: studentId }), [studentId])
  const have = path.stops.filter((stop) => stop.have).length
  const next = path.stops.find((stop) => stop.next)

  useEffect(() => {
    document.body.dataset.view = 'community'
    document.title = 'Social Jackets · WarmPath'
  }, [])

  // The old list steps aside first, then the new one arrives from the side its switch segment is on.
  useEffect(() => {
    if (view === shown) return undefined
    if (REDUCED) { setShown(view); return undefined }
    const swap = setTimeout(() => setShown(view), 130)
    return () => clearTimeout(swap)
  }, [view, shown])

  // Switch the view. A pointer press makes a bee push the old list out with the new one behind it.
  // Keyboard presses, reduced motion and a press during a push get the plain swap above.
  const go = (target, e) => {
    if (target === view) return
    if (!REDUCED && !push && view === shown && e && e.detail > 0) {
      // Fly through the middle of whatever part of the stream is on screen.
      const box = stage.current.getBoundingClientRect()
      const middle = (Math.max(box.top, 120) + Math.min(box.bottom, window.innerHeight)) / 2 - box.top
      // The lists sit side by side like pages, posts on the left, so going to events moves everything left.
      setPush({ id: Date.now(), from: shown, dir: target === 'campus' ? -1 : 1, y: Math.max(80, middle) })
      setArrival('push')
      setShown(target)
    } else {
      setPush(null)
      setArrival('slide')
    }
    setView(target)
  }

  const openDetail = (target) => {
    if (!detail) opener.current = document.activeElement
    if (target.kind === 'profile') loadProfile(target.id)
    setDetail(target)
  }
  const closeDetail = () => {
    setDetail(null)
    if (opener.current && opener.current.isConnected) opener.current.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (!detail) return undefined
    const key = (e) => { if (e.key === 'Escape') closeDetail() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [detail])

  const q = query.trim().toLowerCase()
  const has = (...parts) => !q || parts.some((part) => part && part.toLowerCase().includes(q))
  const visiblePosts = posts
    .filter((post) => has(PROFILES[post.authorId].name, post.text, post.linkedRecordId && RECORDS.get(post.linkedRecordId).title))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const visibleEvents = events.filter((event) => has(event.title, event.organizer, event.location))
  const visibleClubs = CLUBS.filter((club) => has(club.title))
  const campusCount = visibleEvents.length + visibleClubs.length
  const count = shown === 'posts'
    ? plural(visiblePosts.length, 'post')
    : `${plural(visibleEvents.length, 'event')}, ${plural(visibleClubs.length, 'club')}`

  const writing = composing && canPost             // signing out closes an open draft
  const startPost = () => {
    setComposing(true)
    draftInput.current.focus({ preventScroll: true })
  }
  const cancelPost = () => { setComposing(false); setDraft(''); setLinked('') }
  const publish = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || posting) return
    if (demo) {
      addSessionPost({ id: 'post:session:' + Date.now(), authorId: me.id, createdAt: new Date().toISOString(), text, linkedRecordId: linked || null })
    } else {
      setPosting(true)
      setPostError('')
      try {
        await publishPost(text, linked)
      } catch (failure) {
        setPostError(failure.message)   // the draft stays open, so nothing typed is lost
        return
      } finally {
        setPosting(false)
      }
    }
    cancelPost()
    setQuery('')
    go('posts')
  }

  const empty = (what, otherCount, otherView, otherLabel) => (
    <div className="card empty">
      {q ? (
        <>
          <p>No {what} match “{query.trim()}”.</p>
          {otherCount > 0 && <button className="arrow-link cap" onClick={(e) => go(otherView, e)}>{otherCount} in {otherLabel}</button>}
          <button className="arrow-link cap" onClick={() => setQuery('')}>Clear search</button>
        </>
      ) : (
        // Only reachable with backend data: the fixtures are never empty.
        <p>{loading ? `Loading ${what}.` : `No ${what} yet.`}</p>
      )}
    </div>
  )

  const list = (which) => (
    <>
      {which === 'posts' ? (
        <>
          {visiblePosts.map((post, i) => (
            <Post key={post.id} post={post} index={i} onProfile={(id) => openDetail({ kind: 'profile', id })} onRecord={(id) => openDetail({ kind: 'record', id })} />
          ))}
          {!visiblePosts.length && empty('posts', campusCount, 'campus', 'events and clubs')}
        </>
      ) : (
        <>
          {visibleEvents.length > 0 && (
            <section className="card list" style={{ '--i': 0 }}>
              <h2 className="cap">This week</h2>
              <ul>
                {visibleEvents.map((event) => {
                  const day = api.eventDay(event.starts_at)
                  return (
                    <li key={event.id}>
                      <button className="row" onClick={() => openDetail({ kind: 'record', id: event.id })}>
                        <span className="row-date"><span className="cap">{day.weekday}</span><b>{day.day}</b></span>
                        <span className="row-body"><b>{event.title}</b><span>{event.organizer} · {day.time} · {event.location}</span></span>
                        <Arrow />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {visibleClubs.length > 0 && (
            <section className="card list" style={{ '--i': 1 }}>
              <h2 className="cap">Clubs</h2>
              <ul>
                {visibleClubs.map((club) => {
                  const upcoming = EVENTS.filter((event) => event.clubId === club.id).length
                  return (
                    <li key={club.id}>
                      <button className="row" onClick={() => openDetail({ kind: 'record', id: club.id })}>
                        <span className="row-date"><HexIcon /></span>
                        <span className="row-body"><b>{club.title}</b><span>Student club · {plural(upcoming, 'event')} this week</span></span>
                        <Arrow />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {!campusCount && empty('events or clubs', visiblePosts.length, 'posts', 'posts')}
        </>
      )}
      <p className="stream-note" style={{ '--i': 7 }}>{note}</p>
    </>
  )

  return (
    <>
      <Backdrop />
      <div className="veil" />
      <div className="swarm" aria-hidden="true">
        <Canvas orthographic dpr={[1, 2]} gl={{ alpha: false, antialias: false }} camera={{ position: [0, 0, 10], near: 0.1, far: 100 }}>
          <color attach="background" args={['#000000']} />
          <Swarm mode="goal" viewport={viewport} stops={path.stops} />
        </Canvas>
      </div>

      <main className="ui community">
        <TopBar
          active="community" students={students} studentId={studentId} onStudent={onStudent}
          search={{ value: query, onChange: setQuery, placeholder: 'Search posts, events and clubs', label: 'Search Social Jackets' }}
        />

        <div className="community-scroll">
          <div className="community-grid">
            <aside className="card me" aria-label="Your profile">
              <div className="me-banner">{demo && <PathComb stops={path.stops} />}</div>
              <div className="me-body">
                <Avatar name={myName} ring />
                {demo ? (
                  <>
                    <h2>{me.name}</h2>
                    <p className="me-standing">{me.majorName}, {me.year}</p>
                    <a className="me-path" href="#">
                      <span className="cap">Your path</span>
                      <span><b>{have} of {path.stops.length}</b> stops toward {path.goal.label}</span>
                      {next && <span className="me-next">Next for you · {next.name}</span>}
                    </a>
                    <button className="pill" onClick={() => openDetail({ kind: 'profile', id: me.id })}>View profile</button>
                  </>
                ) : real ? (
                  <>
                    <h2>{real.name}</h2>
                    <p className="me-standing">{[real.major || 'Major not set', real.kind === 'alum' ? 'alum' : 'student', real.grad_year && `class of ${real.grad_year}`].filter(Boolean).join(', ')}</p>
                    <div className="me-path">
                      <span className="cap">Your profile</span>
                      <span>{real.profile_visible ? 'Public. You can post, and people can open your profile.' : 'Private. Make it public to post.'}</span>
                    </div>
                    <button className="pill" onClick={openAccount}>Edit profile</button>
                  </>
                ) : (
                  <>
                    <h2>Join Social Jackets</h2>
                    <p className="me-standing">Sign in to post and to set up your profile.</p>
                    <button className="pill hot" onClick={openAccount}>Sign in</button>
                  </>
                )}
              </div>
            </aside>

            <section className="stream">
              <h1 className="sr-only">Social Jackets</h1>
              <div className="card composer">
                <div className="composer-row">
                  <Avatar name={myName} />
                  {writing
                    ? <p className="composer-as">Posting as <b>{myName}</b></p>
                    : <button className="composer-prompt" onClick={canPost ? startPost : openAccount}>
                        {canPost ? `Share an update, ${myName.split(' ')[0]}` : real ? 'Make your profile public to post' : 'Sign in to share an update'}
                      </button>}
                </div>
                <form className="draft" data-open={writing} inert={!writing} onSubmit={publish}>
                  <div>
                    <textarea ref={draftInput} maxLength={POST_LIMIT} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What did you try this week?" aria-label="Post text" />
                    <div className="composer-link">
                      <label className="cap" htmlFor="post-link">Link a club or event</label>
                      <select id="post-link" value={linked} onChange={(e) => setLinked(e.target.value)}>
                        <option value="">None</option>
                        {links.map((link) => <option key={link.value} value={link.value}>{link.label}</option>)}
                      </select>
                    </div>
                    <div className="acts">
                      <button type="button" className="pill" onClick={cancelPost}>Cancel</button>
                      <button className="pill hot" disabled={!draft.trim() || posting}>{posting ? 'Posting' : 'Post'}</button>
                    </div>
                    {postError && <p className="form-error" role="alert">{postError}</p>}
                    <p className="composer-note">
                      {demo ? 'Demo only. Your post stays in this browser tab and is gone after a reload.' : 'Your post is saved to WarmPath, and anyone here can read it.'}
                      {POST_LIMIT - draft.length <= 60 && ` ${POST_LIMIT - draft.length} characters left.`}
                    </p>
                  </div>
                </form>
              </div>

              <div className="stream-bar">
                <Switch label="Show" value={view} onChange={go} options={VIEWS} />
                <p className="stream-count" aria-live="polite">{q ? `${count} for “${query.trim()}”` : count}</p>
              </div>

              <div className="stream-stage" ref={stage} data-push={push ? push.dir : undefined} style={push ? { '--push': push.dir, '--bee-y': `${push.y}px` } : undefined}>
                {push && <div className="stream-panel stream-leaving" key={`out-${push.id}`} aria-hidden="true" inert>{list(push.from)}</div>}
                {push && <Bee key={push.id} />}
                <div
                  className="stream-panel" key={shown} data-view={shown} data-arrive={arrival} data-leaving={view !== shown} data-still={q ? 'true' : undefined}
                  onAnimationEnd={(e) => { if (e.target === e.currentTarget && e.animationName === 'push-in') setPush(null) }}
                >
                  {list(shown)}
                </div>
              </div>
            </section>

            <aside className="card rail" key={shown} aria-label={shown === 'posts' ? 'On campus this week' : 'Latest posts'}>
              {shown === 'posts' ? (
                <>
                  <h2 className="cap">On campus this week</h2>
                  <ol>
                    {events.slice(0, 3).map((event) => {
                      const day = api.eventDay(event.starts_at)
                      return (
                        <li key={event.id}>
                          <button onClick={() => openDetail({ kind: 'record', id: event.id })}>
                            <b>{day.weekday} {day.day}</b>
                            <span><span className="rail-title">{event.title}</span><span className="rail-sub">{event.organizer} · {day.time}</span></span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                  <button className="arrow-link cap" onClick={(e) => go('campus', e)}>All events and clubs</button>
                </>
              ) : (
                <>
                  <h2 className="cap">Latest posts</h2>
                  <ol>
                    {[...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).map((post) => (
                      <li key={post.id}>
                        <button className="rail-post" onClick={(e) => go('posts', e)}>
                          <span className="rail-title">{PROFILES[post.authorId].name}</span>
                          <span className="rail-sub">{post.text}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <button className="arrow-link cap" onClick={(e) => go('posts', e)}>All posts</button>
                </>
              )}
            </aside>
          </div>
        </div>

        <Details detail={detail} onClose={closeDetail} onOpen={openDetail} />
      </main>
    </>
  )
}
