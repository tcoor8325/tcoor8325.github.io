# Homepage forest experiment

Leaves are enabled with `data-leaves="on"` on `<html>` in `index.html`.
Set it to `"off"` and reload for a comparison without attached leaves or litter.
The 15 trees, flowers, and branch animations remain enabled.

Leaf rendering now uses rigid cached vector clusters owned by branches. All
generation parameters remain: density, clustering, placement, divergence, shape,
size, and color variation still determine the generated leaves. At layout time,
their projected silhouettes merge into at most two color paths per branch,
using sampled leaf colors for lighter/darker groups. No per-leaf frame projection,
depth sorting, vein strokes, independent sway, or falling-leaf animation remains.
Each cluster translates/rotates with its branch's projected endpoint and angle.
Clusters stay flat and share branch depth rather than rotating/sorting each leaf
in 3D. Colors remain fixed through sway. Ground litter is static.

Verification: seeded forest (8325), Chromium headless at 1440×1000, scroll Y=600,
24 timing snapshots. Median renderer CPU time: previous leaves 68.5ms, merged
clusters 7.6ms, leaves disabled 5.2ms. Generated 36,069 leaves across 5,550 branch
clusters; about 1,124 clusters were visible in the desktop sample. This measures
render function time, not end-to-end FPS; hardware and forest layout affect it.
Desktop and 390px mobile screenshots checked; no page errors or mobile horizontal
overflow. Initial bitmap-cache attempts did not improve performance and were
replaced by merged vector paths. Historical renderer notes below predate this work.

The genetic-parameters tooltip has been removed, together with its pointer,
click, and keyboard handlers and hover hit-testing. Plant generation and rendering
are unchanged. Older tooltip verification notes below describe past behavior.

Homepage animations are currently enabled with `data-animations="on"` on the
`<html>` element in `index.html`. Change it to `data-animations="off"` and reload
to pause wind, the title fade, and CSS transitions. The garden
is painted across the full canvas while disabled and repainted on layout changes;
scrolling updates only the sky, without rerendering the forest or running a
continuous animation loop. System reduced-motion preferences still apply when
animations are enabled. All original animation code is retained.

`garden.js` grows 15 stochastic parametric L-system plants, paints a layered forest,
animates wind and changes the whole page's sky color with
scroll position. Reload to grow a new forest. No dependencies or external services
are required. Plant genetics and the 100 fallen-leaf samples remain stable on resize.

## Layout and scroll

The greeting sits above the tallest possible crown. The project grid begins at
least 850px (or 115vh) below the heading; the trees occupy that taller stretch of
canvas, with the project cards in the understory. The forest floor sits 140px below
the project's bottom edge. About begins underground, after the soil transition,
with white text, a black background, and a white resume link.
Visual offsets lower the greeting by 100px and raise the project grid by 200px.
They preserve flow spacing, the forest floor, and About's position. The renderer
measures unshifted layout coordinates for its ground and canopy anchors.

The sky is a single solid RGB color at any instant, rather than a spatial gradient.
Scroll progress is `scrollY / (documentHeight - viewportHeight)`, clamped to 0–1.
It interpolates the entire body background from cream `(243, 242, 238)` to midnight
blue `(12, 21, 49)`. Underground remains black regardless of sky color.

## Genetics

Edit `parameters()` in `garden.js`. Each plant samples a complete configuration;
the 44 settings remain defined in each plant's configuration. Angles use
radians, model lengths/diameters scale to the scene, colors use HSL, and
probabilities use 0–1. `rootX` is a fraction of the horizontal spawn interval
from −50px to viewport width + 50px, `rootZ` is scene depth,
and `heightFraction` targets a fraction of the space between the floor and canopy
ceiling. Height fractions above 1 are clamped when projected so the greeting stays
clear of the trees.

- Placement: independent random X, extending at most 50 CSS pixels beyond either
  screen edge, and Z from −4,200 to +700. The pixel limit holds after resizing;
  the stored normalized X sample is remapped to the new spawn interval.
- Scale: five small plants with height fractions 0.05–0.3, and ten others spanning
  0.3–1.1. Height is independent of depth; both small and tall plants occur in front
  and behind. Botanical classifications remain future work.
- Branching: 96–100% probability at each eligible node; usually two branches
  including the continuing stem; three to four lateral orders; mean angle and
  angle variance; length reduction of 80–94% per order.
- Clear trunks: first-branch world height is 240–380 model units for the larger
  plants and 55–100 for small plants. Every new limb also grows two internodes
  before producing daughters. The gate uses actual XYZ turtle coordinates.
- Internodes: average length 42–60 for larger plants and 18–30 for small plants,
  with per-node variance and gentle random 3D bends.
- Thickness: initial stem diameter 14–66 for larger plants and 2–12 for small
  plants, per-internode taper, daughter-to-parent ratio, and minimum diameter.
  Displayed trunk thickness is capped at 6% of viewport width; the same scale
  applies to every limb of that plant to preserve its taper.
- Branch color: brown hues from 20–35 degrees. Hue/saturation stay uniform on a
  plant; depth varies brightness continuously along the branches.
- Leaves: leaves per node, eligible-node spacing, density, clustering,
  node-development probability, divergence angle/variance, size/variance,
  shape/variance, and HSL color/variance. Shapes are lance, oval, and heart.
  Fuller-canopy defaults use 4–7 leaves per node, eligible at every node, with
  density and node-development probability both 94–100%. Height and thickness
  distributions retain more foliage on the lower and larger branches as well.
- Distribution: three probability weights from base to tip, and three from thin
  to thick branches. Both weights contribute to leaf or flower retention.
- Flowers: `hasFlowers`, pattern, HSL color, size/variance, density, clustering,
  node-development probability, and the two distribution arrays. Each forest
  includes both flowering and flowerless plants.
- Growth: 18–22 parallel grammar iterations and at most 400 internodes per plant
  keep full 3D animation of the 15-plant scene bounded. Fully leafless derivations retry up to eight
  times with the same genetics.

## Grammar and 3D rendering

`A` is an apex, `F` an internode, `L` a possible leaf/flower group, and brackets
save/restore the turtle. An apex produces `F L`, optional bracketed daughters,
and a continuing apex. Apices carry the same position and direction as the turtle
so branch-height decisions match the resulting geometry.

The turtle builds XYZ geometry. An oblique projection maps it to the page, then
branches, foliage, flowers, and hills are sorted by average scene depth. Local Z
is scaled and added to root Z for sorting and occlusion by nearer plants.
Depth-based plant shading is currently off. Set `DEPTH_SHADING_ENABLED` to `true`
near the top of `garden.js` to restore it. When off, branches, leaves, and flowers
use their sampled material colors regardless of distance; 3D motion and depth
sorting continue. The hills retain their designed brown layer colors.
When enabled, lightness deliberately spans 12–84%, with material offsets, to
accentuate depth. Branches have no pattern other than that shading. All plant surfaces are
opaque; nodes have no separate markers or colors. This painter's algorithm has
approximate occlusion at long intersecting segments, rather than per-pixel depth.
Wind is calculated in XYZ model space before projection. Every frame reprojects
the moving geometry and sorts it by its updated depth, including crossings with
the terrain. The lighting range stays fixed to the resting scene to avoid global
brightness pumping; when shading is enabled, individual surfaces change brightness as their Z changes.
Lightness is quantized to half-point steps to reuse colors for very small changes.

Flowers repeat identical primitive petals at equal angular intervals around a
circular center: circles (six), ovals (five), triangles (six), squares (four),
diamonds (eight), or hexagons (six).

## Hills, soil, and litter

Three layers use the visible tops of large filled circles. Distant, smaller hills
are dark brown at depth −3,100; middle hills sit at −1,700; the biggest, lightest
foreground circles sit at −250. Trees are drawn between those depths, creating
trunks behind and in front of the terrain. Circular surface paths also block hover
inspection of the geometry they conceal.

Exactly 100 static brown leaves are scattered over the foreground surface. Every
sample takes its shape, width, and size from a source tree and randomizes its
brown color, position, and rotation. `leafPath()` is shared by canopy, litter, and
falling leaves. Foreground trees can cover some of the litter naturally.

At 100px below the floor baseline, brown soil transitions to black over 180px.
The black area fills the rest of the canvas behind About and masks roots/particles.

## Wind and falling leaves

Every `F` internode has fixed mechanical properties calculated once from its
length and diameter. The stylized material constants are density 450, Young's
modulus 80,000, and damping ratio 0.28; model length and radius are scaled into SI
units. These values aim for visible gentle movement, rather than calibrated wood.

For length L, radius r, area second moment I=πr⁴/4, and mass m=ρπr²L:

- Rotational inertia J = mL²/3.
- Rotational spring stiffness k = 3EI/L.
- Rotational damping c = 2ζ√(kJ).
- Natural angular frequency ωn = √(k/J), in radians/second.

`branchAngle()` calculates the analytical damped response to gusts at 0.72 and
1.13 radians/second, with bounded amplitude and resonance gain. Each branch gets
two perpendicular bending axes derived from its resting 3D direction. The second
axis uses 0.83 times the gust frequencies, a 0.37π phase offset, and 80% amplitude,
so movement has both lateral and depth components. Both axes use the same circular
branch's natural frequency and damping.
Their frequency-response gains and phase lags are cached when the branch is built.

Axis-angle quaternions compose the two bends with the parent's 3D orientation.
Rotating each resting branch vector preserves its 3D length. Each child starts at
the parent's moving XYZ endpoint, so joints remain connected and roots stay fixed.
Only after these transformations does the oblique projection produce screen
coordinates. Apparent 2D lengths can change as branches move in depth.

Leaves and flowers have model-space surface axes. Rotating and projecting both
axes gives a 2D affine transform for their cached primitive paths, allowing them
to tilt and foreshorten with their branch. Hover detection inverts that same
transform; nearly edge-on, singular surfaces are skipped safely.

Falling leaves spawn as separate canopy-leaf copies near the visible viewport,
about once every 0.42 seconds, with a maximum of 32 particles. Each keeps its
initial orientation and X coordinate, descending straight down at 32–62px/second.
`surfaceY()` uses the foreground circles to remove
them at the ground; they do not accumulate beyond the static 100 litter samples.

Animation targets 24fps and adapts its cadence down toward 10fps on heavier scenes.
Actual cadence still depends on Canvas painting cost. Model geometry, surface
paths, and material settings are cached between layout changes. Hidden tabs and
views fully underground stop continuous animation. Reduced motion leaves the
forest still, clears particles, and retains scroll-driven sky updates and tooltips.

## Rendering performance

The optimized frame pipeline preserves the full generated forest and 3D motion:

1. Update the branch skeleton in parent-first order. Vectors, quaternions, bends,
   projected coordinates, and bounds reuse their existing buffers.
2. Test each branch's attached foliage cluster against the viewport before
   calculating leaf/flower XYZ positions or projected surface axes. A conservative
   bounding sphere remains valid under every 3D rotation. Ancestor branches still
   update so visible descendants always inherit the correct motion.
3. Populate and sort only `scene.visibleParts`, using updated Z and a stable ID
   tie-break. `scene.parts` is now the unsorted geometry cache. Only foliage with
   `poseVersion === scene.version` has a current derived pose; culled foliage is
   recomputed when its cluster comes back into view.
4. Paint the visible canvas slice with absolute transforms, avoiding a Canvas
   state push/pop for every leaf. Uniform branch colors bypass gradient creation
   when depth shading is off. Visible silhouettes remain intact. Veins are omitted
   below 8 projected pixels, or below 20 pixels on plants farther than Z = −1,800.
   Flowers and larger/nearby leaves retain their detail.
5. Prepare hover data only on pointer movement that needs plant inspection.
   Region objects are pooled and reused; pinned inspectors need no hover work.

The hill/soil paths, soil gradient, and 100 litter paths are cached per layout.
Falling leaves choose sources from the current visible foliage and cache their
own path/color at birth. Fully opaque underground soil allows all concealed
forest simulation, projection, and sorting to be skipped.

To inspect timings, open the homepage with `?gardenProfile=1` and run
`gardenPerformance.snapshot()` in the browser console. The snapshot reports
`motion`, `projection`, `sort`, `paint`, `total`, and `hover` in milliseconds, plus
visible-part, projected/culled-foliage, vein-detail, and hover-record counts.
Timing instrumentation and the diagnostic global are opt-in. Per-frame hover
records stay at zero until the first inspection; subsequent frames reuse the
records without rebuilding them until another inspection needs the new pose.
`hover` and `hoverRecords` describe the last inspection, separately from the
latest animation-frame timings.

Seeded headless Chromium comparison, using the same 37,039 generated parts and
matching layout, camera positions, and simulation times. Values are median
JavaScript/Canvas command-submission times for five frames after two warm-up
frames; they are not guaranteed frame rates on other devices.

| View | 1440px before | 1440px after | 390px before | 390px after |
| --- | ---: | ---: | ---: | ---: |
| Greeting | 45.6ms | 13.0ms | 47.3ms | 7.1ms |
| Canopy | 225.1ms | 122.4ms | 56.6ms | 22.2ms |
| Floor | 144.4ms | 86.6ms | 123.9ms | 45.9ms |
| About / bottom scroll | 74.0ms | 31.4ms | 53.5ms | <0.1ms |

Both viewports were 1,000px tall. The desktop bottom view still includes some
forest; the phone bottom view is fully underground. Dense desktop canopy frames
remain Canvas-painting-bound (about 112ms of the 122ms frame in this sample),
despite the reductions in simulation, projection, sorting, and hover work.

## Interaction and verification

The canvas ignores pointer events. Document-level hover detection lazily prepares
pooled records for the latest visible frame, then checks moving branch segments
and inverse affine-transformed leaf/flower paths, using bounding boxes and reverse
painting order. Terrain and underground soil mask covered targets.
The compact scrollable tooltip stays beside the cursor while hovering. Left click
to pin its current plant and position; moving over other plants, scrolling,
leaving the page, or resizing does not dismiss it. It remains within the viewport
on resize. The next left click closes it, including a click inside the panel;
Escape also closes it. A focused tooltip supports Enter/Space to toggle pinning.
Pinned panels can be scrolled to read all parameters. Project links and About
controls receive their normal events, including when a click closes a pinned panel.

Checked in Chromium at 1440px and 390px widths: no horizontal overflow or page
errors; greeting above the canopy; projects lower in the forest; three hill layers
with seven circular profiles; 15 plants and 100 litter samples; uniform body sky
color changing with scroll; white About text over opaque black canvas pixels.
Animation checks verify changing XYZ branch positions, fixed 3D segment lengths,
connected joints, finite mechanical coefficients, varied natural frequencies,
falling-leaf creation/removal at curved ground, and reduced-motion behavior.
Regression checks also cover all 44 tooltip values, viewport bounds, Escape,
the white resume link, and click-through navigation to a project.
The 3D checks verify fixed roots, connected XYZ joints, unit quaternion rotations,
agreement between XYZ projection and rendered endpoints, moving Z depths,
changing draw order/shading, projected surface tilting, and resting geometry under
reduced motion. A controlled branch/hill crossing checks depth sorting directly.
Syntax: `node --check garden.js`. Earlier stochastic checks covered 300 plants,
finite 3D geometry, brown branch hues, randomized roots, and bounded growth.

Placement checks cover the 50px spawn limit at desktop and phone widths, including
resizing the same forest. Particle checks verify fixed X and rotation while Y
increases, and removal when leaves reach the ground.
Foliage comparison with identical seeded branch geometry produced about 4.8 times
as many leaves as the previous defaults. Tooltip checks cover pinning, movement,
scrolling, resizing, second-click dismissal, keyboard controls, and navigation.
Optimization checks compare against the original renderer at multiple scroll
positions and simulation times, with shading off and on. They verify that no
previously visible candidates are culled, sampled XYZ poses and projected surfaces
match, branch lengths/joints stay intact, and motion/hover buffers are reused.
Separate checks cover high-DPI rendering, the 50px root limit on resize, detailed
and simplified leaf rendering, straight-falling cached particles, reduced motion,
black underground pixels, and skipping concealed forest work.

The greeting has no background panel or shadow. Homepage CSS uses
`?v=garden-14` and the script uses `?v=garden-14`; increment the changed asset's
query string for the next revision to refresh cached assets.
