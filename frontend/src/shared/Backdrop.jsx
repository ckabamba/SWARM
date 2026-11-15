import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import { REDUCED } from './motion.js'

export function Backdrop() {
  return (
    <div className="field" aria-hidden="true">
      <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1} fov={45}>
        <ShaderGradient
          type="waterPlane" animate={REDUCED ? 'off' : 'on'} uSpeed={0.12} uStrength={2.6} uDensity={1.1} uFrequency={5.5}
          color1="#ff8a2a" color2="#ee9b00" color3="#050c1c"
          cDistance={4.4} cPolarAngle={74} cAzimuthAngle={200} positionY={0.6}
          lightType="3d" brightness={0.72} reflection={0.05} grain="on" enableTransition={false}
        />
      </ShaderGradientCanvas>
    </div>
  )
}
