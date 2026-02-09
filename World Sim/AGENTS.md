
If this is your first instruction, please read README and HANDOFF.
# Instructions
Create a new page in my Digital Portfolio called 'World' which will hold our wold simulation. We do not need a picture for right now. Once that's done, let's start by creating the globe.

Build a cube-sphere mesh in Three.js
Why cube-sphere?

You want the mesh’s parameterization to match your cube faces.

Procedure:

Start from a subdivided cube, where each face has an N×N grid.

For each vertex on a cube face, project it onto a sphere:

Normalize the cube position vector: pSphere = normalize(pCube)

Optionally use a “better cube-to-sphere” mapping to reduce distortion, but normalization works to start.

Store for each vertex:

face index 0..5

face UV u,v in [0,1]

or just store direction vector and compute cube-face lookup in the shader

Result: a sphere-looking globe whose “UVs” are naturally cube-map friendly.