import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import api from '../shared/fake-api.js'
import { REDUCED } from '../shared/motion.js'
import { Backdrop } from '../shared/Backdrop.jsx'
import { Hex, Words, Arrow } from '../shared/controls.jsx'
import { TopBar } from '../shared/TopBar.jsx'
import { PeoplePanel } from '../people/PeoplePanel.jsx'
import { SPOTS, place, useViewport } from './layout.js'
import { Swarm } from './Swarm.jsx'
import { Hive } from './Hive.jsx'
import { Node } from './Node.jsx'

export function Experience({ active = true, students, studentId, onStudent }) {
  const [view, setView] = useState('goal')
  const [goalText, setGoalText] = useState('')
  const [panel, setPanel] = useState(null)           // activity id, 'goal', or null
  const viewport = useViewport()
  const path = useMemo(() => api.postPath({ goal: goalText || api.SEEDED_GOALS[0], student_id: studentId }), [studentId, view])
  const closest = api.getPeople({ goal_id: path.goal.id, student_id: studentId }).slice(0, 3)

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

  const submit = (e) => { e.preventDefault(); setView('map') }
  const landing = useRef(null), goalInput = useRef(null), scroll = useRef(0)
  const onScroll = () => {
    const el = landing.current
    scroll.current = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
    el.parentElement.toggleAttribute('data-scrolled', el.scrollTop > 24)
    if (scroll.current > 0.95 && document.activeElement !== goalInput.current) goalInput.current.focus({ preventScroll: true })
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
  const you = place('you', viewport), goal = place('goal', viewport)
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
          <Swarm mode={view} viewport={viewport} stops={path.stops} />
        </Canvas>
      </div>

      <div className="ui">
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
              <form onSubmit={submit}>
                <label htmlFor="goal">WarmPath puts their paths on one map. Where do you want to end up?</label>
                <div className="row">
                  <input id="goal" ref={goalInput} autoComplete="off" spellCheck="false" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder={api.SEEDED_GOALS[0]} />
                  <button className="go" aria-label="Trace the path"><Arrow /></button>
                </div>
                <ul className="seeds cap">
                  {api.SEEDED_GOALS.slice(1).map((g) => (
                    <li key={g}><button type="button" onClick={() => setGoalText(g)}>{g}</button></li>
                  ))}
                </ul>
              </form>
            </div>
          </div>
          <p className="cue cap">Scroll</p>
          <p className="foot cap quiet">
            <span>Each point is one of {api.ALUMNI_TOTAL} alumni</span>
            <span>Seeded demo data · Honeycomb model by <a href="https://poly.pizza/m/6Mqdrv1n3Oo" target="_blank" rel="noreferrer">Poly by Google</a>, CC BY 3.0</span>
          </p>
        </section>

        <section className="map" aria-hidden={view !== 'map'} inert={view !== 'map'}>
          <button className="node end" data-have="true" data-side={you.side} style={{ transform: `translate(${you.x}px, ${you.y}px)`, '--d': '36px', '--at': '500ms' }} onClick={() => onStudent(students.find((s) => s.id !== studentId).id)} aria-label={`Switch demo student. Currently ${path.student.name}`}>
            <Hex />
            <span className="tag">
              <span className="name">You</span>
              <span className="count">{path.student.major}, {api.ordinal(path.student.school_year)} year</span>
            </span>
          </button>
          {path.stops.map((stop) => (
            <Node key={stop.activity_id} stop={stop} at={place(stop.activity_id, viewport)} delay={arrive(SPOTS[stop.activity_id].x)} onOpen={() => setPanel(stop.activity_id)} />
          ))}
          <button className="node end" data-side={goal.side} style={{ transform: `translate(${goal.x}px, ${goal.y}px)`, '--d': '100px', '--at': `${arrive(SPOTS.goal.x)}ms` }} onClick={() => setPanel('goal')}>
            <Hex />
            <span className="tag">
              <span className="name">{path.goal.label}</span>
              <span className="count"><b>{path.goal.achievers} alumni</b> got here</span>
            </span>
          </button>

          <div className="strip">
            <h2 className="cap">This week on your path</h2>
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

          <div className="closest">
            <h2 className="cap">Closest starts to yours</h2>
            {closest.map((person) => (
              <button key={person.id} onClick={() => setPanel('goal')}>
                <b>{person.name}</b>
                <span>{person.major} ’{String(person.grad_year).slice(2)}</span>
              </button>
            ))}
          </div>
        </section>

        <PeoplePanel open={view === 'map' && panel !== null} path={path} activityId={panel} onClose={() => setPanel(null)} />
      </div>
    </>
  )
}
