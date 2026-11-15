import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import { REDUCED } from './motion.js'
import { useTheme } from './theme.js'

/* Fog colours per theme: orange, amber and navy in the dark; gold, white and blue in the light. Navy fog thins to grey over white, so the light blue is brighter. */
const FOG = {
  dark: ['#ff8a2a', '#ee9b00', '#050c1c'],
  light: ['#f2b632', '#ffffff', '#2a5bd0'],
}

export function Backdrop() {
  const theme = useTheme()
  const [color1, color2, color3] = FOG[theme]
  return (
    <div className="field" aria-hidden="true">
      <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1} fov={45}>
        <ShaderGradient
          type="waterPlane" animate={REDUCED ? 'off' : 'on'} uSpeed={0.12} uStrength={2.6} uDensity={1.1} uFrequency={5.5}
          color1={color1} color2={color2} color3={color3}
          cDistance={4.4} cPolarAngle={74} cAzimuthAngle={200} positionY={0.6}
          lightType="3d" brightness={0.72} reflection={0.05} grain={theme === 'light' ? 'off' : 'on'} enableTransition={false}
        />
      </ShaderGradientCanvas>
    </div>
  )
}
