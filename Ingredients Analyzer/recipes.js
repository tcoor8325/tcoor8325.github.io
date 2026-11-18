'use strict';

const UNITS = ['', 'g', 'kg', 'mg', 'oz', 'lb', 'mL', 'L', 'tsp', 'tbsp', 'cup', 'cups', 'fl oz', 'pint', 'quart', 'gallon', 'pinch', 'dash', 'clove', 'slice', 'piece', 'can', 'bunch'];
const CATEGORY_ORDER = ['Vegetable', 'Protein', 'Carbohydrate', 'Fruit', 'Herb', 'Spice', 'Aromatic', 'Fat', 'Acid', 'Sweet', 'Bitter', 'Umami', 'Salt', 'Warm', 'Heat (Cooking Method)'];
const $ = id => document.getElementById(id);
let library = [];
let recipe = null;
let dirty = false;
let storageReady = false;
let saving = false;
let savedRevision = null;
let foods = [];
let selectedFood = null;
let scores = new Map();

const SERVER_HELP = 'Open this page through the running recipe server (by default http://127.0.0.1:4189/Ingredients%20Analyzer/) to save directly. Download Library is available for manual export.';

function showStorageMode(connected) {
  $('storage-status').textContent = connected
    ? 'Connected: recipes save directly to recipes.txt.'
    : 'Direct saving is unavailable. ' + SERVER_HELP;
}
async function readServerLibrary() {
  let response;
  try {
    response = await fetch('api/recipes', { cache: 'no-store' });
  } catch {
    showStorageMode(false);
    throw new Error(SERVER_HELP);
  }
  const connected = response.headers.get('X-Recipe-Server') === '1';
  showStorageMode(connected);
  if (!connected) return null;
  const saved = await response.json();
  if (!response.ok) throw new Error(saved.error || 'The recipe server could not read recipes.txt.');
  if (!Array.isArray(saved) || !saved.every(validateRecipe)
      || new Set(saved.map(item => item.id)).size !== saved.length) throw new Error('The recipe server returned an invalid library.');
  return saved;
}
function notify(text) { $('message').textContent = text; }
function setDirty() {
  dirty = true;
  $('save-status').textContent = 'Unsaved changes';
}
function parseQuantity(value) {
  const text = String(value).trim();
  if (!text) return null;
  let number;
  if (/^\d+\s+\d+\s*\/\s*\d+$/.test(text)) {
    const [whole, top, bottom] = text.split(/[\s/]+/).map(Number);
    number = whole + top / bottom;
  } else if (/^\d+\s*\/\s*\d+$/.test(text)) {
    const [top, bottom] = text.split('/').map(Number);
    number = top / bottom;
  } else if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    number = Number(text);
  }
  return Number.isFinite(number) && number > 0 ? number : NaN;
}
function validateRecipe(item) {
  return item && typeof item.id === 'string' && typeof item.title === 'string'
    && Number.isFinite(item.servings) && item.servings > 0
    && Array.isArray(item.ingredients) && item.ingredients.every(i => i && typeof i.name === 'string' && typeof i.quantity === 'string' && typeof i.unit === 'string')
    && ['preparation', 'cooking'].every(key => Array.isArray(item[key]) && item[key].every(step => typeof step === 'string'))
    && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt));
}
async function loadLibrary() {
  try {
    let saved = await readServerLibrary();
    if (saved === null) {
      const response = await fetch('recipes.txt', { cache: 'no-store' });
      if (!response.ok) throw new Error('Library unavailable');
      saved = await response.json();
    }
    if (!Array.isArray(saved) || !saved.every(validateRecipe) || new Set(saved.map(item => item.id)).size !== saved.length) throw new Error('Invalid library');
    library = saved;
    storageReady = true;
  } catch {
    notify('The recipe library could not be loaded. Check recipes.txt and reload; no data has been changed.');
  }
  renderLibrary();
}
function downloadLibrary(items) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(items, null, 2) + '\n'], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'recipes.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showViewer() {
  dirty = false;
  $('library').hidden = true;
  $('editor').hidden = true;
  $('viewer').hidden = false;
  $('edit-recipe').hidden = false;
  $('view-title').textContent = recipe.title;
  $('view-servings').textContent = `${recipe.servings} servings`;
  $('view-ingredients').replaceChildren();
  recipe.ingredients.forEach(ingredient => {
    const li = document.createElement('li');
    li.textContent = [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ');
    $('view-ingredients').append(li);
  });
  ['preparation', 'cooking'].forEach(kind => {
    const list = $(`view-${kind}`);
    list.replaceChildren();
    recipe[kind].forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      list.append(li);
    });
  });
  $('view-title').focus();
}
function renderLibrary() {
  $('recipe-list').replaceChildren();
  $('empty-library').hidden = library.length > 0 || !storageReady;
  $('empty-library').textContent = 'No recipes yet. Start with New Recipe.';
  $('export-library').disabled = library.length === 0;
  [...library].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).forEach(saved => {
    const li = document.createElement('li');
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'recipe-link';
    open.textContent = saved.title;
    open.addEventListener('click', () => {
      if (!canLeave()) return;
      recipe = structuredClone(saved);
      showViewer();
    });
    const date = document.createElement('span');
    date.className = 'recipe-date';
    date.textContent = `${saved.servings} servings · Updated ${new Date(saved.updatedAt).toLocaleDateString()}`;
    li.append(open, date);
    $('recipe-list').append(li);
  });
}
function canLeave() {
  return !saving && (!dirty || window.confirm('Leave this recipe and discard unsaved changes?'));
}
function showEditor(isNew) {
  if (saving) return;
  $('viewer').hidden = true;
  dirty = isNew;
  $('library').hidden = true;
  $('editor').hidden = false;
  $('recipe-title').value = recipe.title;
  $('servings').value = recipe.servings;
  $('scale-servings').value = recipe.servings;
  $('preparation-input').value = '';
  $('cooking-input').value = '';
  savedRevision = isNew ? null : recipe.updatedAt;
  ['preparation', 'cooking'].forEach(kind => toggleStepInput(kind, false));
  $('save-status').textContent = isNew ? 'Unsaved recipe' : 'Recipe from library';
  if (storageReady) notify('');
  renderIngredients();
  renderSteps('preparation');
  renderSteps('cooking');
  $('recipe-title').focus();
}
function renderIngredients() {
  $('ingredients').replaceChildren();
  recipe.ingredients.forEach((ingredient, index) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    const name = document.createElement('span');
    name.className = 'ingredient-name';
    name.textContent = ingredient.name;
    const quantity = document.createElement('input');
    quantity.type = 'text';
    quantity.className = 'quantity';
    quantity.placeholder = 'Quantity';
    quantity.value = ingredient.quantity;
    quantity.setAttribute('aria-label', `Quantity for ${ingredient.name}`);
    quantity.title = 'A positive number, decimal, fraction (1/2), or mixed number (1 1/2). Leave blank for an unspecified amount.';
    quantity.addEventListener('input', () => {
      ingredient.quantity = quantity.value;
      quantity.setCustomValidity(Number.isNaN(parseQuantity(quantity.value)) ? 'Use a positive number, decimal, or fraction.' : '');
      setDirty();
    });
    const unit = document.createElement('select');
    unit.className = 'unit';
    // Keep a previously saved custom unit available when editing older recipes.
    const choices = UNITS.includes(ingredient.unit) ? UNITS : UNITS.concat(ingredient.unit);
    choices.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value || 'No unit';
      unit.append(option);
    });
    unit.value = ingredient.unit;
    unit.setAttribute('aria-label', `Unit for ${ingredient.name}`);
    unit.addEventListener('change', () => { ingredient.unit = unit.value; setDirty(); });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${ingredient.name}`);
    remove.addEventListener('click', () => { recipe.ingredients.splice(index, 1); setDirty(); renderIngredients(); $('add-ingredient').focus(); });
    row.append(name, quantity, unit, remove);
    li.append(row);
    $('ingredients').append(li);
  });
}
function toggleStepInput(kind, open) {
  $(`${kind}-form`).hidden = !open;
  $(`add-${kind}`).hidden = open;
  $(`add-${kind}`).setAttribute('aria-expanded', String(open));
  if (open) $(`${kind}-input`).focus();
}
function addStepKeyboard(input, kind, index = null) {
  input.setAttribute('aria-describedby', 'step-keyboard-help');
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      // Finish a new step before leaving it; existing steps update as you type.
      if (index === null && input.value.trim()) $(`${kind}-form`).requestSubmit();
      input.blur();
      toggleStepInput(kind, false);
      $(`add-${kind}`).focus();
    } else if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (index === null) {
        $(`${kind}-form`).requestSubmit();
      } else {
        const next = $(`${kind}-steps`).querySelectorAll('textarea')[index + 1];
        if (next) next.focus();
        else toggleStepInput(kind, true);
      }
    }
  });
}
function renderSteps(kind) {
  const list = $(`${kind}-steps`);
  list.replaceChildren();
  recipe[kind].forEach((step, index) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'step-row';
    const text = document.createElement('textarea');
    text.value = step;
    text.rows = Math.max(2, step.split('\n').length);
    text.setAttribute('aria-label', `${kind === 'cooking' ? 'Cooking' : 'Preparation'} step ${index + 1}`);
    text.addEventListener('input', () => { recipe[kind][index] = text.value; setDirty(); });
    addStepKeyboard(text, kind, index);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${kind} step ${index + 1}`);
    remove.addEventListener('click', () => { recipe[kind].splice(index, 1); setDirty(); renderSteps(kind); toggleStepInput(kind, true); });
    row.append(text, remove);
    li.append(row);
    list.append(li);
  });
}
function appendPendingSteps() {
  ['preparation', 'cooking'].forEach(kind => {
    const input = $(`${kind}-input`);
    if (input.value.trim()) {
      recipe[kind].push(input.value.trim());
      input.value = '';
      renderSteps(kind);
    }
  });
}
function validateEditor() {
  if (!$('servings').reportValidity() || !Number.isFinite(Number($('servings').value)) || Number($('servings').value) <= 0) {
    notify('Enter a positive number of servings.');
    return false;
  }
  const invalid = recipe.ingredients.findIndex(i => Number.isNaN(parseQuantity(i.quantity)));
  if (invalid !== -1) {
    notify(`Check the quantity for ${recipe.ingredients[invalid].name}. Use a positive number, decimal, or fraction.`);
    $('ingredients').querySelectorAll('.quantity')[invalid].focus();
    return false;
  }
  return true;
}
$('new-recipe').addEventListener('click', () => {
  if (!canLeave()) return;
  recipe = { id: crypto.randomUUID(), title: 'untitled', servings: 2, ingredients: [], preparation: [], cooking: [], updatedAt: new Date().toISOString() };
  showEditor(true);
  $('recipe-title').select();
});
$('open-library').addEventListener('click', () => {
  if (!canLeave()) return;
  dirty = false;
  recipe = null;
  $('editor').hidden = true;
  $('viewer').hidden = true;
  $('library').hidden = false;
  renderLibrary();
});
$('recipe-title').addEventListener('input', () => { recipe.title = $('recipe-title').value; setDirty(); });
$('servings').addEventListener('input', () => { setDirty(); });
$('edit-recipe').addEventListener('click', () => showEditor(false));
$('cancel-edit').addEventListener('click', () => {
  if (!canLeave()) return;
  const saved = library.find(item => item.id === recipe.id);
  if (saved) {
    recipe = structuredClone(saved);
    showViewer();
  } else {
    dirty = false;
    $('open-library').click();
  }
});
$('save-recipe').addEventListener('click', async () => {
  if (saving || !validateEditor()) return;
  appendPendingSteps();
  recipe.title = $('recipe-title').value.trim() || 'untitled';
  recipe.servings = Number($('servings').value);
  recipe.updatedAt = new Date().toISOString();
  const pending = structuredClone(recipe);
  saving = true;
  $('editor').inert = true;
  try {
    // Wait for the initial read before choosing the save destination.
    await libraryLoaded;
    // Recheck on every save: the server may have started after the page loaded.
    const currentLibrary = await readServerLibrary();
    if (currentLibrary !== null) {
      const response = await fetch('api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: pending, expectedUpdatedAt: savedRevision })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save recipes.txt.');
      library = result;
    } else {
      throw new Error(SERVER_HELP);
    }
    recipe = pending;
    showViewer();
    notify('Saved to recipes.txt. Commit and push to publish.');
  } catch (error) {
    dirty = true;
    $('save-status').textContent = 'Not saved';
    notify(`${error.message} Your draft is still open.`);
  } finally {
    saving = false;
    $('editor').inert = false;
  }
});
$('scale-recipe').addEventListener('click', () => {
  if (!validateEditor() || !$('scale-servings').reportValidity()) return;
  const from = Number($('servings').value);
  const to = Number($('scale-servings').value);
  if (!Number.isFinite(to) || to <= 0) { notify('Enter a positive target serving count.'); return; }
  const scaled = recipe.ingredients.map(i => {
    const amount = parseQuantity(i.quantity);
    return amount === null ? '' : String(Number((amount * to / from).toPrecision(12)));
  });
  if (scaled.some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0))) {
    notify('That serving count makes an ingredient quantity too large or small. Try a smaller change.');
    return;
  }
  recipe.ingredients.forEach((ingredient, index) => { ingredient.quantity = scaled[index]; });
  recipe.servings = to;
  $('servings').value = to;
  setDirty();
  renderIngredients();
  notify(`Scaled ingredient amounts from ${from} to ${to} servings. Review cooking times and seasonings before cooking.`);
});
['preparation', 'cooking'].forEach(kind => {
  $(`add-${kind}`).addEventListener('click', () => toggleStepInput(kind, true));
  addStepKeyboard($(`${kind}-input`), kind);
  $(`${kind}-input`).addEventListener('input', setDirty);
  $(`${kind}-form`).addEventListener('submit', event => {
    event.preventDefault();
    const input = $(`${kind}-input`);
    if (!input.value.trim()) { input.focus(); return; }
    recipe[kind].push(input.value.trim());
    input.value = '';
    setDirty();
    renderSteps(kind);
    input.focus();
  });
});
$('export-library').addEventListener('click', () => downloadLibrary(library));
window.addEventListener('beforeunload', event => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});

function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : null;
}
function selectFood(food) {
  selectedFood = food;
  scores = new Map(foods.map(other => [other.name, food ? cosine(food.embedding, other.embedding) : null]));
  $('selected-food').textContent = food ? food.name : 'No ingredient selected';
  $('confirm-ingredient').disabled = !food;
  $('confirm-ingredient').textContent = food ? `Add ${food.name}` : 'Add Ingredient';
  $('clear-selection').hidden = !food;
  renderFoods();
}
function renderFoods() {
  const query = $('food-search').value.trim().toLocaleLowerCase();
  const category = $('food-category').value;
  const visible = foods.filter(food => food.name.toLocaleLowerCase().includes(query));
  const container = $('food-categories');
  container.replaceChildren();
  const categories = CATEGORY_ORDER.concat([...new Set(foods.flatMap(food => food.tags))].filter(tag => !CATEGORY_ORDER.includes(tag)));
  let count = 0;
  categories.filter(tag => !category || tag === category).forEach(tag => {
    const items = visible.filter(food => food.tags.includes(tag)).sort((a, b) => (scores.get(b.name) ?? -1) - (scores.get(a.name) ?? -1) || a.name.localeCompare(b.name));
    if (!items.length) return;
    count += items.length;
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = `${tag} (${items.length})`;
    const list = document.createElement('ul');
    list.className = 'food-list';
    items.forEach(food => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'food-button';
      button.setAttribute('aria-pressed', String(selectedFood?.name === food.name));
      const name = document.createElement('span');
      name.textContent = food.name;
      button.append(name);
      const score = scores.get(food.name);
      if (score != null) {
        button.style.setProperty('--shade', String(Math.max(0, Math.min(1, score)) * 0.22));
        const value = document.createElement('span');
        value.className = 'food-score';
        value.textContent = score.toFixed(2);
        button.append(value);
      }
      button.addEventListener('click', () => { selectFood(food); $('confirm-ingredient').focus(); });
      li.append(button);
      list.append(li);
    });
    section.append(heading, list);
    container.append(section);
  });
  if (!count && foods.length) container.textContent = 'No matching ingredients. Try another search or category.';
}
$('add-ingredient').addEventListener('click', () => {
  $('food-search').value = '';
  $('food-category').value = '';
  selectFood(selectedFood);
  $('ingredient-picker').showModal();
  $('food-search').focus();
});
function cancelPicker() {
  $('ingredient-picker').close();
  selectFood(null);
  $('add-ingredient').focus();
}
$('close-picker').addEventListener('click', cancelPicker);
$('ingredient-picker').addEventListener('cancel', event => {
  event.preventDefault();
  cancelPicker();
});
$('food-search').addEventListener('input', renderFoods);
$('food-category').addEventListener('change', renderFoods);
$('clear-selection').addEventListener('click', () => selectFood(null));
$('confirm-ingredient').addEventListener('click', () => {
  if (!selectedFood || !recipe) return;
  recipe.ingredients.push({ name: selectedFood.name, quantity: '', unit: '' });
  setDirty();
  renderIngredients();
  $('ingredient-picker').close();
  $('ingredients').lastElementChild.querySelector('.quantity').focus();
});
async function loadFoods() {
  try {
    const response = await fetch('embeddings.json');
    if (!response.ok) throw new Error('Ingredient data unavailable');
    const data = await response.json();
    if (!Array.isArray(data.items) || !data.items.length || !data.items.every(food => typeof food.name === 'string' && Array.isArray(food.tags))) throw new Error('Invalid ingredient data');
    foods = data.items;
    const tags = CATEGORY_ORDER.filter(tag => foods.some(food => food.tags.includes(tag)));
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      $('food-category').append(option);
    });
    $('food-status').textContent = `${foods.length} ingredients available.`;
    renderFoods();
  } catch {
    $('food-status').textContent = 'Ingredients could not be loaded. Reload the page to try again. Saved recipes are still available.';
  }
}
const libraryLoaded = loadLibrary();
loadFoods();
