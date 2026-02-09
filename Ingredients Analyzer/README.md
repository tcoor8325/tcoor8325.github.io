# Ingredients Analyzer

This is another webpage of my digital portfolia and is a tool for helping me choose ingredients to cook a meal with. The webpage shows lists of foods across multiple categories, called 'tags'. When a user selects a food in a certain category, the other lists are sorted based on their semantic similarity to the selected. Foods can have many tags and exist in multiple categories. Foods and their tags are stored in FOODS.md

## To add a new food to the project:
1. Assign Tags. Each food must have at least one tag. Tags are found at the bottom of the README. These assign which categories the food can be found under. Note: Cooking Methods only get the tag 'Heat'
2. list 20 Foods it is often found with
3. list 20 prepared dishes it is often found in

## Workflow: updating foods, embeddings, and scores
1. Edit `FOODS.md` to add or modify entries (each entry must include Name, Tags, and Description).
2. Run `python3 scripts/generate_embeddings.py`.
   - The script parses `FOODS.md`, builds one input string per entry, and calls the embeddings API.
   - Output is written to `embeddings.json` with the vectors aligned to ingredient names.
3. Open `index.html` in a browser (or refresh it).
   - The UI fetches `embeddings.json` on load and stores the vectors in memory.
   - When a food is clicked, the app computes cosine similarity between the selected vector and all others.
   - Each category list is re-sorted by similarity score, and the selected item is pinned to the top.
   - Scores are displayed and used to drive the health-bar color fill on each button.

To get the semantic distance between foods, do the following:
Generate Descriptions: Create a rich text string for each ingredient to give the AI context.

    Bad Input: "Carrot"

    Good Input: "Carrot: A root vegetable, sweet flavor, crunchy texture, common in stews and salads."

Call the API: Send these strings to the text-embedding-3-small model.

Store the Vectors: Save the resulting 1536-dimension vectors in a local JSON file or a vector database like Supabase (pgvector).

## Tags
Salt
Fat
Acid
Sweet
Heat (Cooking Method)
Fruit
Vegetable
Carbohydrate
Protein
Bitter
Umami
Aromatic
Warm
Herb
Spice