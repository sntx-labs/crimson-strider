import * as THREE from './vendor/three.module.js';

// Pixel-aligned 3D tubes: the shared spring simulation owns the attachment points.
// Keep art direction together so the metal and lights are easy to tune later.
export const cableLook = Object.freeze({
  radius: 3.25, mobileRadius: 2.4, metal: '#48403c', metalness: .96,
  roughness: .22, clearcoat: .38, exposure: 1.1, environment: 1.4,
  key: 3.2, rim: 2.1, cursor: 18000, redSpill: 9500,
});
const SEGMENTS = 144, SIDES = 12;

function studioEnvironment(renderer) {
  // Local HDR softboxes supply reflections even where no direct light hits metal.
  const width = 512, height = 256, data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height;
    const box = (cx, cy, sx, sy) => Math.exp(-Math.pow((u - cx) / sx, 8) - Math.pow((v - cy) / sy, 8));
    const cool = box(.23, .47, .025, .30) * 5.5;
    const warm = box(.73, .36, .06, .15) * 3.2;
    const overhead = box(.5, .12, .28, .035) * 4;
    const i = (y * width + x) * 4;
    data[i] = .045 + cool * .82 + warm + overhead;
    data[i + 1] = .043 + cool * .9 + warm * .83 + overhead * .95;
    data[i + 2] = .042 + cool + warm * .68 + overhead * .88;
    data[i + 3] = 1;
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(texture);
  texture.dispose(); pmrem.dispose();
  return environment;
}

function metalMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: cableLook.metal, metalness: cableLook.metalness,
    roughness: cableLook.roughness, clearcoat: cableLook.clearcoat,
    clearcoatRoughness: .18, envMapIntensity: cableLook.environment,
  });
  const uniforms = { cableCharge: { value: 0 }, cableBrightness: { value: 0 }, cableHeat: {value:0}, cableVariation:{value:0}, cableFrequency:{value:5}, cablePhase:{value:0} };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec2 cableUV;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\ncableUV = uv;');
    shader.fragmentShader = `varying vec2 cableUV;
      uniform float cableCharge, cableBrightness, cableHeat, cableVariation, cableFrequency, cablePhase;
      float steelGrain(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       float grain = steelGrain(floor(cableUV * vec2(2100., 46.)));
       roughnessFactor *= .88 + grain * .24;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float power = (1. - smoothstep(cableCharge - .012, cableCharge + .012, cableUV.x))
         * step(.001, cableCharge) * cableBrightness;
       // Retain a dark shaded side and hot reflected edge as the red front descends.
       float facing = .23 + .77 * pow(max(normal.z, 0.), 2.);
       float phase=cableUV.x*cableFrequency*6.283185+cablePhase;
       float peak=pow(.5+.5*sin(phase+sin(phase*1.73)*.7),3.);
       float energy=mix(1.,.08+.92*peak,cableVariation);
       totalEmissiveRadiance += mix(vec3(1.9,.012,.008),vec3(2.8,1.5,.6),cableHeat) * power * facing * energy;`);
  };
  material.customProgramCacheKey = () => 'syntax-cable-steel-v2';
  return { material, uniforms };
}

function createTube(scene) {
  const count = (SEGMENTS + 1) * (SIDES + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2).setUsage(THREE.DynamicDrawUsage));
  const indices = [];
  for (let i = 0; i < SEGMENTS; i++) for (let j = 0; j < SIDES; j++) {
    const a = i * (SIDES + 1) + j, b = a + SIDES + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  geometry.setIndex(indices);
  const { material, uniforms } = metalMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, uniforms, samples: Array.from({ length: SEGMENTS + 1 }, () => new THREE.Vector3()),
    lengths: new Float32Array(SEGMENTS + 1) };
}

const tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3();
const start = new THREE.Vector3(), control = new THREE.Vector3(), end = new THREE.Vector3();
function nodePosition(node, index, total, depth, target) {
  return target.set(node.x + node.ox, -node.y - node.oy,
    Math.sin(index / total * Math.PI) * depth + node.ox * .04);
}

function updateTube(tube, cable, radius) {
  const { samples, lengths, mesh } = tube, { nodes, index } = cable;
  const spans = nodes.length - 1;
  const depth = index === 3 ? -6 : index === 4 ? 7 : 2 + index * 1.8;
  for (let i = 0; i <= SEGMENTS; i++) {
    const step = i / SEGMENTS * spans, segment = Math.min(spans - 1, Math.floor(step));
    const t = Math.min(1, step - segment), u = 1 - t;
    nodePosition(nodes[segment], segment, spans, depth, start);
    nodePosition(nodes[segment + 1], segment + 1, spans, depth, control);
    if (segment) start.add(control).multiplyScalar(.5);
    if (segment < spans - 1) {
      nodePosition(nodes[segment + 2], segment + 2, spans, depth, end).add(control).multiplyScalar(.5);
      samples[i].copy(start).multiplyScalar(u * u).addScaledVector(control, 2 * u * t).addScaledVector(end, t * t);
    } else samples[i].lerpVectors(start, control, t);
    lengths[i] = i ? lengths[i - 1] + samples[i].distanceTo(samples[i - 1]) : 0;
  }
  const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal, uv = mesh.geometry.attributes.uv;
  for (let i = 0; i <= SEGMENTS; i++) {
    const p = samples[i], along = lengths[i] / lengths[SEGMENTS];
    tangent.subVectors(samples[Math.min(SEGMENTS, i + 1)], samples[Math.max(0, i - 1)]).normalize();
    normal.set(-tangent.y, tangent.x, 0).normalize();
    binormal.crossVectors(tangent, normal).normalize();
    // Slightly thicker attachment sleeves, with a continuous surface into each cord.
    const sleeve = 1 + .24 * (1 - THREE.MathUtils.smoothstep(lengths[i], 5, 11));
    for (let j = 0; j <= SIDES; j++) {
      const angle = j / SIDES * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
      const nx = normal.x * c + binormal.x * s, ny = normal.y * c + binormal.y * s, nz = normal.z * c + binormal.z * s;
      const k = i * (SIDES + 1) + j;
      positions.setXYZ(k, p.x + nx * radius * sleeve, p.y + ny * radius * sleeve, p.z + nz * radius * sleeve);
      normals.setXYZ(k, nx, ny, nz);
      uv.setXY(k, along, j / SIDES);
    }
  }
  positions.needsUpdate = normals.needsUpdate = uv.needsUpdate = true;
}

export function createMetalCables(field, count, onContextChange) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cableLook.exposure;
  renderer.domElement.className = 'cable-canvas';
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, .1, 1200);
  camera.position.z = 600;
  let environment = studioEnvironment(renderer);
  scene.environment = environment.texture;
  const key = new THREE.DirectionalLight(0xe9edf5, cableLook.key);
  key.position.set(-180, 220, 250);
  const rim = new THREE.DirectionalLight(0xffd6bb, cableLook.rim);
  rim.position.set(260, -100, 110);
  const cursor = new THREE.PointLight(0xcbdfff, cableLook.cursor, 800, 2);
  const red = new THREE.PointLight(0xff1a10, 0, 650, 2);
  scene.add(key, rim, cursor, red);
  const tubes = Array.from({ length: count }, () => createTube(scene));
  let width = 0, height = 0, available = true;
  let cursorX = .5, cursorY = .25;
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); available = false; onContextChange(false);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    environment.dispose();
    environment = studioEnvironment(renderer);
    scene.environment = environment.texture;
    available = true; onContextChange(true);
  });
  field.append(renderer.domElement);
  return {
    destroy() { for (const tube of tubes) { tube.mesh.geometry.dispose(); tube.mesh.material.dispose(); } environment.dispose(); renderer.dispose(); renderer.domElement.remove(); },
    resize(w, h) {
      if (w === width && h === height) return;
      width = w; height = h;
      camera.right = w; camera.bottom = -h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    pointer(x, y) { cursorX = x / (width || 1); cursorY = y / (height || 1); },
    draw(cables, charge, brightness, reduced, glow, time) {
      if (!available || !width) return;
      renderer.toneMappingExposure=glow.exposure;
      for (const [index, cable] of cables.entries()) {
        if (!cable.nodes.length) continue;
        const tube = tubes[index];
        updateTube(tube, cable, width <= 600 ? cableLook.mobileRadius : cableLook.radius);
        tube.uniforms.cableCharge.value = reduced ? charge : THREE.MathUtils.clamp(charge * 1.15 - index * .023, 0, 1);
        tube.uniforms.cableBrightness.value = brightness * glow.emission;
        tube.uniforms.cableHeat.value=glow.coreHeat;
        tube.uniforms.cableVariation.value=glow.variation;
        tube.uniforms.cableFrequency.value=glow.frequency;
        tube.uniforms.cablePhase.value=index*1.7-(reduced?0:time*glow.speed);
      }
      cursor.position.set(cursorX * width, -cursorY * height, 100);
      red.position.set(width * .5, -height * .16, 65);
      red.intensity = cableLook.redSpill * brightness;
      renderer.render(scene, camera);
    },
  };
}
