World Sim is a grand strategy project focused on ecology.

**Current Implementation**
- A full-viewport Three.js scene renders a cube-sphere globe with cube-friendly parameterization.
- The globe is built from a subdivided cube (N x N per face) and each vertex is projected to a sphere via normalization.
- A custom grid overlay is drawn from per-face lines to avoid seam artifacts at cube corners.
- Orbit controls are enabled without inertia and with no auto-spin.
- The background is seamless with the page (no windowed stage).

**Files**
- `index.html`: Full-screen canvas and import map for Three.js.
- `main.js`: Cube-sphere mesh generation, grid overlay, lighting, and controls.
- `styles.css`: Full-viewport layout and sky-like background.

**Planned Layers**
- Geology
- Hydrology
- Climate
- Soil
- Population Density
- Goods Production
- Unrest
