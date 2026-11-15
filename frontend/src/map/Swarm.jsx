import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { REDUCED } from '../shared/motion.js'
import { STRANDS as DEMO_STRANDS, SAMPLES, DUST as DEMO_DUST, HEX_R, SPOTS, mulberry, dealStrands, hexKey, hexLattice, place } from './layout.js'

const HEAT = `
  vec3 heat(float t) {
    vec3 a = vec3(0.05, 0.15, 0.3);     // cold: navy
    vec3 b = vec3(0.82, 0.6, 0.12);     // warm: gold
    vec3 c = vec3(1.0, 0.62, 0.06);     // hot: amber
    vec3 d = vec3(1.0, 0.93, 0.62);     // hottest
    return t < 0.33 ? mix(a, b, t / 0.33) : t < 0.66 ? mix(b, c, (t - 0.33) / 0.33) : mix(c, d, (t - 0.66) / 0.34);
  }
`

export function Swarm({ mode, viewport, stops, spots = SPOTS, aggregate = false, routes = null }) {
  const STRANDS = routes ? routes.length : aggregate ? Math.max(1, stops.length) : DEMO_STRANDS
  // Ambient decoration, independent of the number of alumni or associations.
  const DUST = DEMO_DUST
  const { gl } = useThree()
  const strands = useMemo(() => aggregate ? (stops.length ? stops.map(s => [s.activity_id]) : [[]]) : dealStrands(stops), [stops, aggregate])

  const dust = useMemo(() => {
    const rand = mulberry(4)
    return Array.from({ length: DUST }, () => ({
      hx: rand() - 0.5, hy: rand() - 0.5,
      r: 14 + rand() * 46,
      w1: 0.08 + rand() * 0.22, w2: 0.07 + rand() * 0.2,
      p1: rand() * 6.28, p2: rand() * 6.28,
      size: 5 + rand() * 8,
      x: 0, y: 0, heat: 0, alpha: 0,
    }))
  }, [DUST, STRANDS])

  // Strand curves in world pixels (origin at centre, y up).
  const curves = useMemo(() => {
    const rand = mulberry(29)
    const { w, h } = viewport
    const world = (p) => new THREE.Vector3(p.x - w / 2, h / 2 - p.y, 0)
    if (routes) return routes.map(keys => {
      const points = keys.map(key=>world(place(key,viewport,spots)))
      const curve = new THREE.CurvePath()
      for(let i=0;i<points.length-1;i++) {
        const a=points[i],b=points[i+1],reach=(b.x-a.x)*.5
        curve.add(new THREE.CubicBezierCurve3(a,new THREE.Vector3(a.x+reach,a.y,0),new THREE.Vector3(b.x-reach,b.y,0),b))
      }
      return curve.getSpacedPoints(SAMPLES-1)
    })
    const you = place('you', viewport, spots), goal = place('goal', viewport, spots)
    const order = [...stops].sort((a, b) => spots[a.activity_id].x - spots[b.activity_id].x)
    return strands.map((ids) => {
      const pts = [world({ x: you.x, y: you.y + (rand() - 0.5) * 10 })]
      order.filter((s) => ids.includes(s.activity_id)).forEach((s) => {
        const p = place(s.activity_id, viewport, spots)
        const spread = 3 + s.achievers * 1.5
        pts.push(world({ x: p.x + (rand() - 0.5) * 6, y: p.y + (rand() - 0.5) * spread }))
      })
      pts.push(world({ x: goal.x, y: goal.y + (rand() - 0.5) * 12 }))
      const route = new THREE.CurvePath()
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], reach = (b.x - a.x) * 0.5
        route.add(new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + reach, a.y, 0), new THREE.Vector3(b.x - reach, b.y, 0), b))
      }
      return route.getSpacedPoints(SAMPLES - 1)
    })
  }, [strands, stops, viewport, spots, routes])

  // The hive: every cell on screen, and for the cells on a route, how many strands cross it.
  const hexGeo = useMemo(() => {
    const { w, h } = viewport
    const rings = Math.ceil(Math.hypot(w, h) / 2 / (HEX_R * 1.5)) + 1
    const cells = hexLattice(rings).filter((p) => Math.abs(p.x) < w / 2 + HEX_R && Math.abs(p.y) < h / 2 + HEX_R)
    const index = new Map(cells.map((p, i) => [hexKey(p.x, p.y), i]))
    const crossing = cells.map(() => new Set())
    const first = new Float32Array(cells.length).fill(2)
    const lead = new Float32Array(cells.length)
    curves.forEach((pts, strand) => pts.forEach((p, k) => {
      const i = index.get(hexKey(p.x, p.y))
      if (i === undefined) return
      crossing[i].add(strand)
      const u = k / (SAMPLES - 1)
      if (u < first[i]) { first[i] = u; lead[i] = strand }
    }))
    const g = new THREE.BufferGeometry().setFromPoints(cells)
    g.setAttribute('aHeat', new THREE.BufferAttribute(Float32Array.from(crossing, (set) => Math.sqrt(set.size / STRANDS)), 1))
    g.setAttribute('aU', new THREE.BufferAttribute(first, 1))
    g.setAttribute('aStrand', new THREE.BufferAttribute(lead, 1))
    return g
  }, [curves, viewport])
  useEffect(() => () => hexGeo.dispose(), [hexGeo])

  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(DUST), 1))
    g.setAttribute('aHeat', new THREE.BufferAttribute(new Float32Array(DUST), 1))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(DUST), 1))
    return g
  }, [DUST, STRANDS])

  const trailGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = STRANDS * SAMPLES
    const u = new Float32Array(n), s = new Float32Array(n)
    for (let i = 0; i < STRANDS; i++) for (let k = 0; k < SAMPLES; k++) {
      u[i * SAMPLES + k] = k / (SAMPLES - 1)
      s[i * SAMPLES + k] = i
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('aU', new THREE.BufferAttribute(u, 1))
    g.setAttribute('aStrand', new THREE.BufferAttribute(s, 1))
    return g
  }, [DUST, STRANDS])

  useEffect(() => {
    const pos = trailGeo.attributes.position
    curves.forEach((pts, i) => pts.forEach((p, k) => pos.setXYZ(i * SAMPLES + k, p.x, p.y, 0)))
    pos.needsUpdate = true
  }, [curves, trailGeo])

  const hexMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uDpr: { value: gl.getPixelRatio() },
      uProgress: { value: new Array(STRANDS).fill(0) },      // how far each strand has drawn, 0 to 1
      uPointer: { value: new THREE.Vector2(9999, 9999) },
      uHalf: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: `
      attribute float aHeat; attribute float aU; attribute float aStrand;
      uniform float uDpr; uniform float uProgress[${STRANDS}]; uniform vec2 uPointer; uniform vec2 uHalf;
      varying float vHeat; varying float vNear; varying float vRim;
      void main() {
        vHeat = aHeat * smoothstep(0.0, 0.07, uProgress[int(aStrand)] - aU);
        vNear = smoothstep(200.0, 0.0, distance(position.xy, uPointer));
        vRim = smoothstep(0.35, 1.05, length(position.xy / uHalf));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = ${(HEX_R * 2).toFixed(1)} * uDpr;
      }`,
    // Each point sprite is one flat-topped cell: a thin wall, and a fill that takes the route's heat.
    fragmentShader: `
      varying float vHeat; varying float vNear; varying float vRim;
      void main() {
        vec2 q = abs((gl_PointCoord - 0.5) * 2.0);
        float d = max(q.y, q.x * 0.866025 + q.y * 0.5) / 0.866025;
        if (d > 1.0) discard;
        float wall = smoothstep(0.9, 0.97, d);
        float fill = 1.0 - smoothstep(0.84, 0.9, d);
        float a = wall * (0.03 + vRim * 0.055 + vNear * 0.2 + vHeat * 0.42) + fill * (vHeat * 0.17 + vNear * 0.025);
        gl_FragColor = vec4(vec3(0.92, 0.67, 0.0) * a, 1.0);
      }`,
  }), [gl, STRANDS])

  const dustMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uDpr: { value: gl.getPixelRatio() } },
    vertexShader: `
      attribute float aSize; attribute float aHeat; attribute float aAlpha;
      uniform float uDpr; varying float vHeat; varying float vAlpha;
      void main() {
        vHeat = aHeat; vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uDpr;
      }`,
    fragmentShader: `
      varying float vHeat; varying float vAlpha;
      ${HEAT}
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(heat(vHeat) * a * a * vAlpha, 1.0);
      }`,
  }), [gl, STRANDS])

  const trailMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uDpr: { value: gl.getPixelRatio() }, uProgress: { value: new Array(STRANDS).fill(0) } },
    vertexShader: `
      attribute float aU; attribute float aStrand;
      uniform float uDpr; uniform float uProgress[${STRANDS}];
      varying float vOn;
      void main() {
        vOn = smoothstep(0.0, 0.04, uProgress[int(aStrand)] - aU);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 15.0 * uDpr;
      }`,
    // Additive: one strand is a dull ember, nine stacked strands burn yellow.
    fragmentShader: `
      varying float vOn;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.34, 0.09) * a * a * 0.085 * vOn, 1.0);
      }`,
  }), [gl, STRANDS])

  const pointer = useRef({ x: 9999, y: 9999, sx: 9999, sy: 9999 })
  useEffect(() => {
    const move = (e) => { if (REDUCED) return; pointer.current.x = e.clientX - window.innerWidth / 2; pointer.current.y = window.innerHeight / 2 - e.clientY }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [DUST, STRANDS])

  const clock = useRef({ mapAt: null })
  useEffect(() => {
    clock.current.mapAt = mode === 'map' ? 'pending' : null
    if (mode !== 'map') trailMat.uniforms.uProgress.value.fill(0)
  }, [mode, trailMat])

  useFrame(({ clock: c }, dt) => {
    const t = REDUCED ? 0 : c.elapsedTime
    const { w, h } = viewport
    const state = clock.current
    if (state.mapAt === 'pending') state.mapAt = t
    const onMap = state.mapAt !== null
    const p = pointer.current
    p.sx += (p.x - p.sx) * Math.min(1, dt * 5); p.sy += (p.y - p.sy) * Math.min(1, dt * 5)
    const progress = trailMat.uniforms.uProgress.value
    hexMat.uniforms.uPointer.value.set(p.sx, p.sy)
    hexMat.uniforms.uHalf.value.set(w / 2, h / 2)
    hexMat.uniforms.uProgress.value = progress
    const pos = dustGeo.attributes.position, size = dustGeo.attributes.aSize
    const heatAttr = dustGeo.attributes.aHeat, alpha = dustGeo.attributes.aAlpha
    const ease = Math.min(1, dt * 2.2)

    for (let i = 0; i < DUST; i++) {
      const d = dust[i]
      let x = d.hx * w * 1.04 + Math.sin(t * d.w1 + d.p1) * d.r
      let y = d.hy * h * 1.04 + Math.cos(t * d.w2 + d.p2) * d.r
      // The pointer warms whatever it passes over.
      const dx = x - p.sx, dy = y - p.sy
      const near = Math.max(0, 1 - Math.hypot(dx, dy) / 170)
      x += dx * near * 0.35; y += dy * near * 0.35
      let heat = 0.3 + near * 0.6, a = onMap ? 0.22 : 0.85, sz = d.size

      if (i < STRANDS && onMap) {
        const e = t - state.mapAt - 0.2 - i * 0.085
        const pts = curves[i]
        heat = 1; a = 1; sz = 11
        if (REDUCED) { progress[i] = 1; x = pts[SAMPLES - 1].x; y = pts[SAMPLES - 1].y; a = 0 }
        else if (e < 0.9) {
          const k = Math.max(0, e / 0.9), s = k * k * (3 - 2 * k)
          x += (pts[0].x - x) * s; y += (pts[0].y - y) * s
          heat = 0.3 + 0.7 * s; a = 0.85 + 0.15 * s; sz = d.size + (11 - d.size) * s
        } else {
          const first = 2.5, loop = 7 + (i % 5) * 1.3
          const e2 = e - 0.9
          let u
          if (e2 < first) { const k = e2 / first; u = 1 - Math.pow(1 - k, 2.2); progress[i] = Math.max(progress[i], u + 0.02) }
          else { u = ((e2 - first) % loop) / loop; progress[i] = 1.1; a = Math.min(1, u / 0.06, (1 - u) / 0.06) }
          const f = u * (SAMPLES - 1), k0 = Math.min(SAMPLES - 2, Math.floor(f)), fr = f - k0
          x = pts[k0].x + (pts[k0 + 1].x - pts[k0].x) * fr
          y = pts[k0].y + (pts[k0 + 1].y - pts[k0].y) * fr
        }
        d.x = x; d.y = y
      } else {
        d.x = x; d.y = y
      }
      d.heat += (heat - d.heat) * ease; d.alpha += (a - d.alpha) * ease
      pos.setXYZ(i, d.x, d.y, 0)
      size.setX(i, sz); heatAttr.setX(i, i < STRANDS && onMap ? heat : d.heat); alpha.setX(i, i < STRANDS && onMap ? a : d.alpha)
    }
    pos.needsUpdate = size.needsUpdate = heatAttr.needsUpdate = alpha.needsUpdate = true
  })

  return (
    <>
      <points geometry={hexGeo} material={hexMat} frustumCulled={false} />
      <points geometry={trailGeo} material={trailMat} frustumCulled={false} />
      <points geometry={dustGeo} material={dustMat} frustumCulled={false} />
    </>
  )
}
