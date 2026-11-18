## AGENTS_INGREDIENTS.md - Human Writes instructions that are executed by Codex
If this is your first command read the README.md and HANDOFF.md before executing the
commands here

Stop and ask me if you have any questions about the instructions before or during execution.

## Task 1: Complete
We're going to switch gears and fully redo the Ingredients Analyzer page. It's instead going to become an interface where I can design and save recipes. The ingredients analyzer will become a tool embedded in this larger interface that the user can play with to consider ingredients to use. Other features are the ability to scale up or down a recipe to a specific number of servings, calculating an estimation of the nutrition per serving, and an estimation of the various planetary costs of the meal, like CO2, water, land use, and so on.

When I enter the page, there is a button on top that says 'New Recipe'. Below that button is 'Recipe Library', which opens saved recipes.

When clicking 'New Recipe', the user can enter a name of the dish in a transparent text box (default name is 'untitled'). The recipe can be saved and reopened from the recipe library. Under the recipe title is a '+' symbol to add a new ingredient. Once an ingredient is added, another plus appears under that. The user picks ingredients from a categorized list with the help of a search bar, rather than typing in their own ingredents. This is becuase each ingredient will be linked to nutritional and environmental information. After selecting the kind of ingredient, the user can insert a quantity, which can be a whole number, fraction, or decimal, and then a unit or no units. Ingredients are added as an unordered list. For now the list of ingredients and their categories will be the same as in the ingredients analyzer. The ingredients Analyzer will be baked into the ingredients picker, and when an ingredient is selected the others will be highlighted to show semantic proximity. When the user is selecting the ingredients to add, the

Below the ingredients list is another transparent text box that lets the user add preparation steps, which are added as an ordered list. Below that the user can add cooking steps in the same manner.

The style of this interface will be clear and clean, almost as if it were a basic HTML document. Use a white background and black Times New Roman font. Buttons are borderless.

## Task 2: Complete

Let's store recipes as a .txt file. The only person that can make recipes is myself on my machine, which are then truly saved after I commit my changes to GitHub.

Let's make unit (optional) a dropdown.

From the Recipe Library, clicking on a recipe displays the recipe, but does not reveal edit tools. Create a new button called 'Edit Recipe' that looks the same as the recipe viewer, but with the ability to add and remove ingredients, quantities, and steps.

## Task 3: Complete
Hitting enter while writing a Preparation or Cooking step moves you on to the next preparation or cooking step. Hitting ESC then makes you stop editing the step.

Instead of making a text file, just save all recipes to one big text file.

In both the recipe editor and recipe viewer (which have the samde formatting) the text is centered in the page, not to the left margin. Put the number of serving along the right margin.

## Task 4: Complete
Write a python file that communicates with the recipes.txt file to seamlessly pull and push recipes from it, similar to how the Historical Tech Tree Project uses text files to store metadata about each tech.

The New Recipe, Recipe Library, and Main Menu buttons should be along the left edge of the page. Remove the instructions texts that start with 'Save Recipe downloads...', and 'Nutrition and environmental...'

The text box that is stylized with the text 'Add a preparation step...' with the horizontal line beneath and the plus sign to the right should be totall hidden until the plus sign is clicked. The plus sign should be centered in the middle of the page.

When in the Choose an ingredient page, hitting escape should close the window and cancel the action.
## Foods to Add, Remove, or Edit:
