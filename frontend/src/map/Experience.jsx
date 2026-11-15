import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import api from '../shared/fake-api.js'
import { REDUCED } from '../shared/motion.js'
import { Backdrop } from '../shared/Backdrop.jsx'
import { Hex, Words, Arrow } from '../shared/controls.jsx'
import { TopBar } from '../shared/TopBar.jsx'
import { LivePeoplePanel } from '../people/LivePeoplePanel.jsx'
import { Access } from '../history/Shared.jsx'
import './live-experience.css'
import { PeoplePanel } from '../people/PeoplePanel.jsx'
import { SPOTS, spotsFor, place, useViewport } from './layout.js'
import { Swarm } from './Swarm.jsx'
import { Hive } from './Hive.jsx'
import { Node } from './Node.jsx'

export function Experience({ active = true, students, studentId, onStudent, live = null }) {
  const Gate = live ? Access : Fragment
  const [view, setView] = useState('goal')
  const [goalText, setGoalText] = useState('')
  const [panel, setPanel] = useState(null)           // activity id, 'goal', or null
  const viewport = useViewport()
  const fixturePath = useMemo(() => live ? null : api.postPath({ goal: goalText || api.SEEDED_GOALS[0], student_id: studentId }), [studentId, view, goalText, !!live])
  const path = live ? (live.path || { student: {name:'You'}, goal:{label:'',achievers:0}, stops:[], events:[] }) : fixturePath
  const spots = useMemo(() => spotsFor(path.stops), [path.stops, !!live])
  useEffect(() => { if (live) { setView(live.path ? 'map' : 'goal'); setPanel(null) } }, [live?.path])
  const closest = live ? [] : api.getPeople({ goal_id: path.goal.id, student_id: studentId }).slice(0, 3)

  useEffect(() => {
    if (!active) return
    document.body.dataset.view = view
    document.title = 'WarmPath'
  }, [view, active])
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') setPanel(null) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const submit = (e) => { e.preventDefault(); if (live) live.submit(); else if (fixturePath.reason !== 'no_match') setView('map') }
  const landing = useRef(null), goalInput = useRef(null), scroll = useRef(0)
  const onScroll = () => {
    const el = landing.current
    scroll.current = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
    el.parentElement.toggleAttribute('data-scrolled', el.scrollTop > 24)
    if (scroll.current > 0.95 && document.activeElement !== goalInput.current) goalInput.current?.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (!active || !landing.current) return undefined
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) entry.target.dataset.seen = 'true' })
    }, { root: landing.current, threshold: 0.55 })
    landing.current.querySelectorAll('.beat').forEach((beat) => seen.observe(beat))
    return () => seen.disconnect()
  }, [active])
  const toGoal = () => landing.current.scrollTo({ top: landing.current.scrollHeight, behavior: REDUCED ? 'auto' : 'smooth' })
  const you = place('you', viewport, spots), goal = place('goal', viewport, spots)
  const arrive = (x) => (REDUCED ? 0 : Math.round(1100 + x * 2300))

  if (!active) return null

  return (
    <>
      <Backdrop />
      <div className="veil" />
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <radialGradient id="hot">
            <stop offset="0" stopColor="#fff7dc" /><stop offset="0.3" stopColor="#ffe9a8" />
            <stop offset="0.66" stopColor="#eaaa00" /><stop offset="1" stopColor="#8f5c00" />
          </radialGradient>
        </defs>
      </svg>
      <div className="hive" aria-hidden="true">
        <Canvas dpr={[1, 2]} frameloop={view === 'goal' ? 'always' : 'never'} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, position: [0, 0, 10] }}>
          <hemisphereLight args={['#ffe2a0', '#160a02', 0.75]} />
          <directionalLight position={[-3, 4, 6]} intensity={2.6} color="#fff3d6" />
          <pointLight position={[3, -2.5, 2.5]} intensity={45} color="#ff6a1f" />
          <Hive scroll={scroll} />
        </Canvas>
      </div>
      <div className="swarm" aria-hidden="true">
        <Canvas orthographic dpr={[1, 2]} gl={{ alpha: false, antialias: false }} camera={{ position: [0, 0, 10], near: 0.1, far: 100 }}>
          <color attach="background" args={['#000000']} />
          <Swarm key={`${path.goal.id || 'empty'}:${path.stops.length}`} mode={view} viewport={viewport} stops={path.stops} spots={spots} aggregate={true}/>
        </Canvas>
      </div>

      <div className={live ? "ui live-experience" : "ui"}>
        <TopBar active="path" onHome={() => { setView('goal'); setPanel(null) }} students={students} studentId={studentId} onStudent={onStudent} />

        <section className="goal" aria-hidden={view !== 'goal'} inert={view !== 'goal'}>
          <div className="landing" ref={landing} onScroll={onScroll}>
            <div className="beat">
              <Words as="h1">Every year, Tech students land the internship you want.</Words>
              <button className="jump cap" onClick={toGoal}>Set your goal</button>
            </div>
            <div className="beat right">
              <Words as="p" className="say">They joined certain teams and took certain classes. Then they graduated and took that knowledge with them.</Words>
            </div>
            <div className="beat ask">
              <Gate>
              <form onSubmit={submit}>
                <label htmlFor="goal">WarmPath puts their paths on one map. Where do you want to end up?</label>
                <div className="row">
                  <input id="goal" ref={goalInput} autoComplete="off" spellCheck="false" required={!!live} maxLength={300} value={live ? live.query : goalText} onChange={(e) => live ? live.setQuery(e.target.value) : setGoalText(e.target.value)} placeholder={live ? "Your goal" : api.SEEDED_GOALS[0]} />
                  <button className="go" aria-label="Trace the path" disabled={live && (live.busy || !live.query.trim())}><Arrow /></button>
                </div>
                <ul className="seeds cap">
                  {!live && api.SEEDED_GOALS.slice(1).map((g) => (
                    <li key={g}><button type="button" onClick={() => setGoalText(g)}>{g}</button></li>
                  ))}
                </ul>
                {!live && goalText && fixturePath.reason === 'no_match' && <p role="status">Choose one company, such as NVIDIA, Google, Microsoft or Apple. This demo has synthetic histories for 25 companies.</p>}
                {live?.busy && <p role="status">Finding your path...</p>}
                {live?.error && <p role="alert">{live.error}</p>}
                {live?.match?.status === 'no_match' && <p role="status">No shared alumni goal matches yet. Try another goal or <a href="/thermal/">browse campus resources</a>.</p>}
                {live?.match?.status === 'ambiguous' && <div role="group" aria-label="Choose a matching goal"><p>Which goal did you mean?</p>{live.match.candidates.map(g => <button className="pill" type="button" key={g.id} onClick={() => live.submit(g.id)}>{g.label}</button>)}</div>}
              </form>
              </Gate>
            </div>
          </div>
          <p className="cue cap">Scroll</p>
          <p className="foot cap quiet">
            <span>{live ? "Shared histories, not verified outcomes" : `${api.ALUMNI_TOTAL} synthetic alumni ? Invented histories`}</span>
            <span>{live ? "WarmPath" : "Seeded demo data"} · Honeycomb model by <a href="https://poly.pizza/m/6Mqdrv1n3Oo" target="_blank" rel="noreferrer">Poly by Google</a>, CC BY 3.0</span>
          </p>
        </section>

        <section className="map" aria-hidden={view !== 'map'} inert={view !== 'map'}>
          <button className="node end" data-have="true" data-side={you.side} style={{ transform: `translate(${you.x}px, ${you.y}px)`, '--d': '36px', '--at': '500ms' }} onClick={() => live ? location.assign("#/history") : onStudent(students.find((s) => s.id !== studentId).id)} aria-label={live ? "Review your history" : `Switch demo student. Currently ${path.student.name}`}>
            <Hex />
            <span className="tag">
              <span className="name">You</span>
              <span className="count">{[path.student.major, path.student.school_year && `${api.ordinal(path.student.school_year)} year`].filter(Boolean).join(", ") || path.student.name}</span>
            </span>
          </button>
          {path.stops.map((stop) => (
            <Node total={path.goal.achievers} key={stop.activity_id} stop={stop} at={place(stop.activity_id, viewport, spots)} delay={arrive(spots[stop.activity_id].x)} onOpen={() => setPanel(stop.activity_id)} />
          ))}
          <button className="node end" data-side={goal.side} style={{ transform: `translate(${goal.x}px, ${goal.y}px)`, '--d': '100px', '--at': `${arrive(SPOTS.goal.x)}ms` }} onClick={() => setPanel('goal')}>
            <Hex />
            <span className="tag">
              <span className="name">{path.goal.label}</span>
              <span className="count"><b>{path.goal.achievers} alumni</b> {live ? "shared this goal" : "got here"}</span>
            </span>
          </button>

          <div className="strip">
            {!live && <p className="cap">Synthetic demo ? 1,000 invented alumni</p>}
            <h2 className="cap">{live ? "Your path" : "This week on your path"}</h2>
            {live && <><button className="pill" onClick={() => { setView("goal"); setPanel(null) }}>Change goal</button><p className="quiet">{path.reason === "not_enough_achievers" ? "At least three shared alumni histories are needed to show stops." : path.reason ? "No earlier activity meets the evidence thresholds." : "Lines show aggregate associations, not individual alumni routes."}</p></>}
            <ol>
              {path.events.slice(0, 3).map((event) => {
                const day = api.eventDay(event.starts_at)
                const stop = path.stops.find((s) => s.activity_id === event.activity_id)
                return (
                  <li key={event.id}>
                    <b>{day.weekday} {day.day}</b>
                    <div>{event.title} <span>· {stop.name} · {day.time}, {event.location}</span></div>
                  </li>
                )
              })}
            </ol>
          </div>

          {!live && <div className="closest">
            <h2 className="cap">Closest starts to yours</h2>
            {closest.map((person) => (
              <button key={person.id} onClick={() => setPanel('goal')}>
                <b>{person.name}</b>
                <span>{person.major} ’{String(person.grad_year).slice(2)}</span>
              </button>
            ))}
          </div>}
        </section>

        {live ? <LivePeoplePanel open={view === "map" && panel !== null} path={path} activityId={panel} onClose={() => setPanel(null)}/> : <PeoplePanel open={view === 'map' && panel !== null} path={path} activityId={panel} onClose={() => setPanel(null)} />}
      </div>
    </>
  )
}
