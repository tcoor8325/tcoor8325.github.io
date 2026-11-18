## AGENTS_Root.md - Human Writes instructions that are executed by Codex

If this is your first command read the README.md and HANDOFF.md before executing the 
commands here

Stop and ask me if you have any questions about the instructions before or during execution.

This current project will be about adding experimental plant life to the website's home page.

# Instruction 1: Complete
When the website loads, a host of various plants will be randomly generated in the background. Each plant is an L-System encoding varying degrees of certain parameters along with a bit of randomness. The parameters are as follows:
Branching Probability
Number of Branches per Node (almost always 2)
Branching Frequency
Branching Order Limit
Mean Branching Angle
Branch Angle Variance
Branch Length Reduction Ratio
Branch Tickness Reduction Ratio
Internode Length
Internode Length Variance
Initial Stem Diameter
Daughter to Parent Branch Diameter Ratio
Minimum Branch Diameter
Leaves per Node
Leaf Divergence Angle
Leaf Divergence Variance
Distance between Leaf-Bearing nodes
Leaf Density
Leaf Clustering Strength
probability a node developes a leaf
Leaf distribution by height
Leaf distribution by branch size
Leaf Shape
Leaf Shape Variance
Leaf Color
Leaf Color Variance
Leaf Size
Leaf Size Variance

I've already built L-systems before so I want to experiment with automating the creating with AI. I also in particular want to experient with creating these in "3D", in that the nodes are given 3D coordinates and deptch is shown through shading and branch crossings.

To start, we will generate 5 random plants in the background of the home page.

# Instruction 2: Complete

Let's have all the plants start with their bottom node along the bottom edge of the homepage cnavas, not floating off in the air.
Hovering over a plant should show its genetic parameters in a tooltip. 
Add a Branch Color parameter, from brown to green
All branches should be a single color.
All branches and leaves should be opaque.
Nodes should not be colored.

# Instruction 3: Complete

The tooltip should appear by the cursor, not at the top of the page.
Currently the plants are still starting by the top of the canvas, but they need to start at the bottom of the canvas, under the 'About' section.
I think the Initail Stem Diameter can be boosted, and branch divergence should be much more common, among other possible tweaks. Right now all of the plants are looking like twigs, not trees.

# Instruction 4: Complete

Let's add a new parameter for Minimum height before first branch, so as to get some taller trunks and a real understory going.
Let's also make it far more likely for a node to end in branching, so that the plants appear fuller. 
Let's also increase the average length of a branch.
For the 3D effect shading, let's greatly accentuate that effect so I can observe it and make sure it is working. Like really change around the brightness, from light to dark based on distance from the 'camera'. Other than the shading, the branches should have no color pattern.

Let's now also introduce flowers. Not every tree has flowers. All flowers are made of primitive shapes like circles, ovals, triangles, squares, diamonds, and hexagons, in some kind of rotationally symmetric pattern. Their parameters are:
Flower Pattern (as discussed above)
Flower color
Flower Size
Flower Density
Flower Clustering Strength
Probability a node developes a Flower
Flower Distribution by Height
Flower Distribution by Branch Size
Flower Size Variance

# Instruction 5: Complete
I want a lot more plants and much taller plants, so let's now generate 20 plants. Thier Z-Axis is now a variable, so they can start further behind another (and more in shadow)
Ensure that the starting positions horizantally and back-and-forth is random.
Let's increase the maximum initial branch width to 3 of what it is now, while also allowing some small understory plants to flourish. 
All branches should be varying shades of brown, not green.

# Instruction 6: Complete
Let's create a forest floor. Increase the average initial branch size before branching. As you scroll down the page, the cream background darkens into midnight blue.
Let's allow trees to exist even further back in the background. The forest floor is a horizontal strip of brown that is covered in 100 randomly placed leaves from the above trees, except they are varying shades of brown. In order to create a sense of depth, some initial branches (trunks) exist on top of the strip of ground while others are behind. Let's also increase the randomness of the sizes, so that we don't only have tall trees in the forefround. Let's also increase the number of trees to 30, and also allow trees to spawn byond the horizontal esges of the canvas, so that only their later branches are visible.

# Instruction 7: Complete
1. In order to better force the perception of depth, let's change the forest floor from being made of a single rectangle to being made of the tops of very large circles, with smaller, draker circles placed behind those in the foreground to give the sense of hills in the distance.

2. As for the darkening background, it's not that the background should be a color gradient, but rather that the color of the backround should be a function of scroll distance. This way the entire background changes color together.

3. Because of the heights the plants are reaching now, let's make the canvas taller. The text 'Hi, I'm Thomas' should be above the trees. The square project viewer links should be further down, in the understory. 

4. Let's put the 'About' section underground. 'Underground' will be under the forest floor we created, which will be a black rectangle of canvas. We will need a gradient transition from the brown of the forest floor to the black of underground. We should also switch the text color of the About section to white.

5. Let's try to add a waving animation to all of the trees, as if wind were gently blowing on them. Each branch should have a hard-coded natural frequency of oscillation based on their length and width (think of their rotational moment, rotational damping coeff., and roational spring stiffnewss.)

6. Let's also add leaves gently falling to the forest floor. It's ok if they simply disappear as they reach the ground.

## Future Work, dont implement yet.
Let's make certain classifications of plants:
Deciduous Trees, which are always brown and have the longest limbs
Conferous Trees, which are also always brown and have long limbs, who have a higher bias to having their branches grow horizontal rather than vertical (which is a new parameter we will have to add) and have very narrow leaves in clusters
Ferns, which have very short initial branches, only branch a few times, and have many broad leaves, and are green
