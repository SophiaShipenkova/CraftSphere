import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uCameraPosition;
  uniform float uTime;
  uniform float uPulse;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(uCameraPosition - vWorldPosition);
    float ndv = max(dot(N, V), 0.001);
    float fresnel = pow(1.0 - ndv, 2.45);

    vec3 p = normalize(vWorldPosition);
    float tm = uTime;

    float ex =
      tm * 0.068 +
      0.52 * sin(tm * 0.039 + 0.62) +
      0.31 * sin(tm * 0.057 + 2.05);
    float ey =
      tm * 0.056 +
      0.58 * sin(tm * 0.045 + 1.94) +
      0.27 * sin(tm * 0.063 + 0.41);
    float ez =
      tm * 0.049 +
      0.44 * sin(tm * 0.042 + 1.17) +
      0.33 * sin(tm * 0.066 + 2.72);

    float cx = cos(ex);
    float sx = sin(ex);
    float cy = cos(ey);
    float sy = sin(ey);
    float cz = cos(ez);
    float sz = sin(ez);

    mat3 Rx = mat3(
      1.0, 0.0, 0.0,
      0.0, cx, -sx,
      0.0, sx, cx
    );
    mat3 Ry = mat3(
      cy, 0.0, sy,
      0.0, 1.0, 0.0,
      -sy, 0.0, cy
    );
    mat3 Rz = mat3(
      cz, -sz, 0.0,
      sz, cz, 0.0,
      0.0, 0.0, 1.0
    );

    vec3 pr = Rz * Ry * Rx * p;

    float theta = atan(pr.z, pr.x);
    float phi = acos(clamp(pr.y, -1.0, 1.0));

    float drift = tm * 0.031;
    float flow = theta * 2.05 + phi * 1.55 + drift;
    float w1 = sin(flow) * 0.5 + 0.5;
    float w2 = sin(flow * 1.82 + phi * 2.65 + drift * 1.15) * 0.5 + 0.5;
    float w3 = sin(theta * 3.75 + phi * 2.15 + drift * 0.95) * 0.5 + 0.5;

    vec3 cMagenta = vec3(0.96, 0.16, 0.58);
    vec3 cPink = vec3(1.0, 0.38, 0.68);
    vec3 cCyan = vec3(0.28, 0.68, 1.0);
    vec3 cViolet = vec3(0.46, 0.2, 0.94);

    float blendCyan = clamp(w2 * 0.52 + 0.06 * sin(flow * 0.85 + drift), 0.0, 1.0);
    float blendPink = clamp(w3 * 0.38 + 0.05 * sin(phi * 1.4 + drift), 0.0, 1.0);

    vec3 base = mix(cMagenta, cViolet, smoothstep(0.08, 0.92, w1));
    base = mix(base, cCyan, blendCyan);
    base = mix(base, cPink, blendPink);

    float contourPhase = theta * 5.0 + phi * 3.2 + tm * 0.14;
    float hueAlong = sin(contourPhase) * 0.5 + 0.5;
    vec3 rimHueA = mix(vec3(0.92, 0.36, 0.68), vec3(0.32, 0.72, 0.96), hueAlong);
    vec3 rimHueB =
      mix(
        vec3(0.65, 0.32, 0.92),
        vec3(0.94, 0.48, 0.78),
        sin(contourPhase * 1.35 + tm * 0.095) * 0.5 + 0.5
      );
    vec3 rimTint =
      mix(rimHueA, rimHueB, sin(tm * 0.088 + theta * 3.0) * 0.5 + 0.5);

    float rimStrength = fresnel * uPulse * (0.48 + 0.38 * fresnel);
    vec3 rimGlow = rimTint * rimStrength;
    vec3 rimSoft = vec3(0.62, 0.52, 0.82) * fresnel * 0.085;

    vec3 color = base + rimGlow + rimSoft;

    gl_FragColor = vec4(color, 1.0);
  }
`

/**
 * Несколько аддитивных «облаков» на сфере: широкий мягкий fresnel (без острого discard),
 * слои разного радиуса + дрейф цвета — визуально как размытая туманность с «дышащим» радиусом.
 */
const fragmentShaderNebulaHalo = /* glsl */ `
  precision highp float;

  uniform vec3 uCameraPosition;
  uniform float uTime;
  uniform float uGlowPulse;
  uniform float uHaloWeight;
  uniform float uPhaseOffset;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(uCameraPosition - vWorldPosition);
    float ndv = max(dot(N, V), 0.0);
    float rim = 1.0 - ndv;

    float mist = pow(max(rim, 0.0), 0.78);
    float soft = smoothstep(0.0, 0.98, mist);

    vec3 p = normalize(vWorldPosition);
    float theta = atan(p.z, p.x);
    float phi = acos(clamp(p.y, -1.0, 1.0));

    float drift =
      sin(theta * 2.8 + phi * 2.1 + uTime * 0.31 + uPhaseOffset) *
      sin(phi * 3.2 - uTime * 0.22 + uPhaseOffset * 1.3);

    vec3 cRose = vec3(1.0, 0.26, 0.62);
    vec3 cSky = vec3(0.32, 0.74, 1.0);
    vec3 cAura = vec3(0.58, 0.32, 0.98);
    vec3 col = mix(cRose, cSky, drift * 0.5 + 0.5);
    col = mix(col, cAura, sin(theta * 4.0 + uTime * 0.38 + uPhaseOffset) * 0.5 + 0.5);

    float breathe =
      uGlowPulse *
      (0.48 + 0.62 * sin(uTime * 0.68 + uPhaseOffset)) *
      (0.82 + 0.28 * sin(uTime * 1.05 + uPhaseOffset * 2.0));

    vec3 rgb = col * soft * mist * uHaloWeight * breathe * 5.1;

    gl_FragColor = vec4(rgb, 1.0);
  }
`

const HALO_LAYERS: Array<{ base: number; weight: number; phase: number }> = [
  { base: 1.035, weight: 0.32, phase: 0.0 },
  { base: 1.09, weight: 0.24, phase: 1.15 },
  { base: 1.15, weight: 0.185, phase: 2.35 },
  { base: 1.24, weight: 0.132, phase: 3.5 },
  { base: 1.36, weight: 0.088, phase: 4.85 },
  { base: 1.52, weight: 0.058, phase: 6.0 },
  { base: 1.72, weight: 0.036, phase: 7.4 }
]

/**
 * Иридесцентное ядро + мягкая «туманность» аддитивными слоями (меняющийся масштаб).
 */
export function HeroScene() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#030508')

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80)
    camera.position.set(-0.35, 0.1, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.92
    mount.appendChild(renderer.domElement)

    const coreUniforms = {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uPulse: { value: 1 },
      uGlowPulse: { value: 1 }
    }

    const geometry = new THREE.SphereGeometry(2.08, 80, 80)

    const haloMaterials: THREE.ShaderMaterial[] = []
    const root = new THREE.Group()

    const sharedRefs = {
      uTime: coreUniforms.uTime,
      uCameraPosition: coreUniforms.uCameraPosition,
      uGlowPulse: coreUniforms.uGlowPulse
    }

    for (let i = 0; i < HALO_LAYERS.length; i++) {
      const spec = HALO_LAYERS[i]
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...sharedRefs,
          uHaloWeight: { value: spec.weight },
          uPhaseOffset: { value: spec.phase }
        },
        vertexShader,
        fragmentShader: fragmentShaderNebulaHalo,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.FrontSide
      })
      haloMaterials.push(mat)
      const mesh = new THREE.Mesh(geometry, mat)
      mesh.scale.setScalar(spec.base)
      mesh.renderOrder = 1 + i
      root.add(mesh)
    }

    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: coreUniforms,
      vertexShader,
      fragmentShader,
      transparent: false
    })

    const coreMesh = new THREE.Mesh(geometry, coreMaterial)
    coreMesh.renderOrder = 50

    root.add(coreMesh)
    scene.add(root)

    const clock = new THREE.Clock()
    let rafId = 0

    const layoutRoot = () => {
      const w = mount.clientWidth || window.innerWidth
      if (w < 840) {
        root.position.x = 0.25
        camera.position.x = 0
      } else {
        root.position.x = 1.62
        camera.position.x = -0.35
      }
    }

    const resize = () => {
      const w = mount.clientWidth || window.innerWidth
      const h = mount.clientHeight || window.innerHeight || 1
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      layoutRoot()
    }

    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    window.addEventListener('resize', resize)

    const haloMeshes = root.children.filter((c) => c !== coreMesh) as THREE.Mesh[]

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      coreUniforms.uTime.value = elapsed
      coreUniforms.uCameraPosition.value.copy(camera.position)
      coreUniforms.uPulse.value = 0.82 + 0.18 * Math.sin(elapsed * 1.25)
      coreUniforms.uGlowPulse.value = 0.78 + 0.2 * Math.sin(elapsed * 0.92)

      haloMeshes.forEach((mesh, i) => {
        const spec = HALO_LAYERS[i]
        const slow = Math.sin(elapsed * 0.41 + spec.phase * 0.85)
        const mid = Math.sin(elapsed * 0.73 + spec.phase * 1.4)
        const breathe = 1 + 0.072 * slow + 0.038 * mid
        mesh.scale.setScalar(spec.base * breathe)
      })

      root.rotation.y = elapsed * 0.038
      root.rotation.x = Math.sin(elapsed * 0.055) * 0.05
      root.position.y = Math.sin(elapsed * 0.22) * 0.085

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('resize', resize)
      geometry.dispose()
      coreMaterial.dispose()
      haloMaterials.forEach((m) => m.dispose())
      renderer.dispose()
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="hero-scene">
      <div className="hero-scene__canvas-host" ref={mountRef} />
      <div className="hero-scene__gleam" aria-hidden />
    </div>
  )
}
