import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { REDUCED } from '../shared/motion.js'
import { HEX_R, hexLattice } from './layout.js'

/*
 * The centrepiece of the landing. Scrolling carries it through three poses, and it
 * eases after the scroll position, so it keeps a little momentum.
 * Model: "Honeycomb" by Poly by Google, CC BY 3.0, https://poly.pizza/m/6Mqdrv1n3Oo
 */
const POSES = [
  { x: 0.24, y: -0.01, size: 1.55, tilt: 0.95, turn: -0.55, roll: 0.1, alpha: 1 },     // beside the opening line
  { x: -0.26, y: 0.0, size: 1.65, tilt: 0.28, turn: 2.2, roll: -0.18, alpha: 1 },      // swung across, seen edge on
  { x: 0.31, y: 0.22, size: 0.88, tilt: Math.PI / 2, turn: 4.4, roll: 0, alpha: 0.6 }, // face on, clear of the goal field
]

/* If the model file cannot load (a page opened straight from disk), stand in seven cells from the same lattice. */
function standInComb() {
  const comb = new THREE.Group()
  const cell = new THREE.CylinderGeometry(0.98, 0.98, 1, 6, 1, true)
  const wax = new THREE.MeshStandardMaterial({ color: '#d9a52c', roughness: 0.85, side: THREE.DoubleSide })
  hexLattice(1).forEach((p, i) => {
    const mesh = new THREE.Mesh(cell, wax)
    mesh.position.set(p.x / HEX_R, 0, p.y / HEX_R)
    mesh.rotation.y = Math.PI / 6
    mesh.scale.y = 0.55 + (i % 3) * 0.12
    comb.add(mesh)
  })
  comb.scale.setScalar(0.38)
  return comb
}

export function Hive({ scroll }) {
  const { viewport, gl } = useThree()
  const group = useRef()
  const [comb, setComb] = useState(null)
  const live = useRef({ p: 0, px: 0, py: 0, mx: 0, my: 0 })

  useEffect(() => {
    let mounted = true
    new GLTFLoader().load(import.meta.env.BASE_URL + 'models/honeycomb.glb',
      (gltf) => {
        gltf.scene.position.set(0.05, 0.11, 0.07)
        gltf.scene.traverse((o) => { if (o.isMesh) { o.material.color.set('#ffcf85'); o.material.roughness = 0.6; o.material.metalness = 0.2 } })
        if (mounted) setComb(gltf.scene)
      },
      undefined,
      () => { if (mounted) setComb(standInComb()) })
    const move = (e) => { live.current.mx = e.clientX / window.innerWidth - 0.5; live.current.my = e.clientY / window.innerHeight - 0.5 }
    window.addEventListener('pointermove', move)
    return () => { mounted = false; window.removeEventListener('pointermove', move) }
  }, [])

  useFrame(({ clock }, dt) => {
    const s = live.current, g = group.current
    const follow = REDUCED ? 1 : 1 - Math.exp(-dt * 5)
    s.p += (scroll.current - s.p) * follow
    s.px += (s.mx - s.px) * follow; s.py += (s.my - s.py) * follow
    const leg = Math.min(POSES.length - 2, Math.floor(s.p * (POSES.length - 1)))
    const k = Math.min(1, Math.max(0, s.p * (POSES.length - 1) - leg)), f = k * k * (3 - 2 * k)
    const a = POSES[leg], b = POSES[leg + 1]
    const mix = (key) => a[key] + (b[key] - a[key]) * f
    const idle = REDUCED ? 0 : clock.elapsedTime * 0.12
    g.position.set(mix('x') * viewport.width, mix('y') * viewport.height, 0)
    g.scale.setScalar(mix('size'))
    g.rotation.set(mix('tilt') + s.py * 0.25, mix('turn') + idle, mix('roll') + s.px * 0.2)
    gl.domElement.style.opacity = mix('alpha')
  })

  return <group ref={group}>{comb && <primitive object={comb} />}</group>
}
