(() => {
  const params = new URLSearchParams(window.location.search);
  const proxyBase = (params.get("proxy") || "http://localhost:8070").replace(/\/+$/, "");

  const statusEl = document.getElementById("proxy-status");
  const foodGroupsEl = document.getElementById("food-groups");
  const resultEl = document.getElementById("food-result");
  const cityButtons = Array.from(document.querySelectorAll(".city-button"));
  const yearSelect = document.getElementById("year-select");
  const dateSlider = document.getElementById("date-slider");
  const selectedDateEl = document.getElementById("selected-date");
  let selectedCity = "";
  let selectedDateIso = "";
  let selectedDateDisplay = "";
  let activeFoodButton = null;

  const fallbackFoodGroups = [
    {
      name: "Quick Picks",
      subcategories: [
        {
          name: "Common",
          foods: ["apples", "bananas", "oranges", "tomatoes", "lettuce", "onions", "potatoes", "almonds"],
        },
      ],
    },
  ];

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function formatDateUtc(date) {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function toIsoDateUtc(date) {
    return date.toISOString().slice(0, 10);
  }

  function updateSelectedDate() {
    const year = Number(yearSelect.value);
    const dayIndex = Number(dateSlider.value);
    const date = new Date(Date.UTC(year, 0, 1 + dayIndex));
    selectedDateDisplay = formatDateUtc(date);
    selectedDateIso = toIsoDateUtc(date);
    selectedDateEl.textContent = selectedDateDisplay;
  }

  function initializeDateSelection() {
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for (let y = currentYear - 3; y <= currentYear + 1; y++) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
    dateSlider.min = "0";
    dateSlider.max = String((isLeapYear(currentYear) ? 366 : 365) - 1);
    dateSlider.step = "1";
    dateSlider.value = "0";
    updateSelectedDate();

    dateSlider.addEventListener("input", () => {
      updateSelectedDate();
      resetResult();
    });
    yearSelect.addEventListener("change", () => {
      dateSlider.max = String((isLeapYear(Number(yearSelect.value)) ? 366 : 365) - 1);
      if (Number(dateSlider.value) > Number(dateSlider.max)) {
        dateSlider.value = dateSlider.max;
      }
      updateSelectedDate();
      resetResult();
    });
  }

  function initializeCitySelection() {
    const initial = cityButtons.find((button) => button.classList.contains("is-active")) || cityButtons[0];
    if (!initial) {
      return;
    }
    selectedCity = initial.dataset.city || "";
    cityButtons.forEach((button) => {
      button.classList.toggle("is-active", button === initial);
      button.addEventListener("click", () => {
        selectedCity = button.dataset.city || "";
        cityButtons.forEach((other) => {
          other.classList.toggle("is-active", other === button);
        });
        resetResult();
      });
    });
  }

  function setProxyStatus(message, ok) {
    statusEl.textContent = message;
    statusEl.classList.remove("is-ready", "is-error");
    statusEl.classList.add(ok ? "is-ready" : "is-error");
  }

  function setLoading(resultEl, food) {
    resultEl.classList.add("is-loading");
    resultEl.textContent = `Loading ${food}...`;
  }

  function clearResult(resultEl) {
    resultEl.classList.remove("is-loading");
    resultEl.textContent = "";
  }

  function appendText(parent, className, text) {
    const node = document.createElement("p");
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
  }

  function appendField(parent, label, value) {
    const row = document.createElement("p");
    row.className = "result-field";

    const labelEl = document.createElement("span");
    labelEl.className = "result-field-label";
    labelEl.textContent = `${label}: `;

    const valueEl = document.createElement("span");
    valueEl.className = "result-field-value";
    valueEl.textContent = value || "Not listed";

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    parent.appendChild(row);
  }

  function normalizeFoodLabel(label) {
    return String(label || "")
      .replace(/\s+\(available\)\s*$/i, "")
      .trim();
  }

  function parseFoodMarkdown(markdown) {
    const groups = [];
    let currentGroup = null;
    let currentSubcategory = null;

    for (const rawLine of markdown.split(/\r?\n/)) {
      const line = rawLine.replace(/\t/g, "    ").trimEnd();

      const headingMatch = line.match(/^#\s+(.+)$/);
      if (headingMatch) {
        currentGroup = { name: headingMatch[1].trim(), subcategories: [] };
        groups.push(currentGroup);
        currentSubcategory = null;
        continue;
      }

      const subcategoryMatch = line.match(/^- (.+)$/);
      if (subcategoryMatch) {
        if (!currentGroup) {
          continue;
        }
        currentSubcategory = { name: normalizeFoodLabel(subcategoryMatch[1]), foods: [] };
        currentGroup.subcategories.push(currentSubcategory);
        continue;
      }

      const foodMatch = line.match(/^\s{2,}- (.+)$/);
      if (foodMatch && currentSubcategory) {
        const normalized = normalizeFoodLabel(foodMatch[1]);
        if (normalized) {
          currentSubcategory.foods.push(normalized);
        }
      }
    }

    return groups
      .map((group) => ({
        name: group.name,
        subcategories: group.subcategories
          .map((subcategory) => {
            const seen = new Set();
            const foods = subcategory.foods.filter((food) => {
              const key = food.toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return { name: subcategory.name, foods };
          })
          .filter((subcategory) => subcategory.foods.length > 0),
      }))
      .filter((group) => group.subcategories.length > 0);
  }

  function renderFoodGroups(groups) {
    foodGroupsEl.innerHTML = "";

    groups.forEach((group, groupIndex) => {
      const groupNode = document.createElement("section");
      groupNode.className = "food-group";

      const groupTitle = document.createElement("h2");
      groupTitle.className = "food-group-title";
      groupTitle.textContent = group.name;
      groupNode.appendChild(groupTitle);

      group.subcategories.forEach((subcategory, subIndex) => {
        const details = document.createElement("details");
        details.className = "subcategory-dropdown";
        if (groupIndex === 0 && subIndex === 0) {
          details.open = true;
        }

        const summary = document.createElement("summary");
        summary.className = "subcategory-summary";
        summary.textContent = `${subcategory.name} (${subcategory.foods.length})`;
        details.appendChild(summary);

        const foodsWrap = document.createElement("div");
        foodsWrap.className = "subcategory-foods";

        subcategory.foods.forEach((foodName) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "food-button";
          button.dataset.food = foodName;
          button.textContent = foodName;
          foodsWrap.appendChild(button);
        });

        details.appendChild(foodsWrap);
        groupNode.appendChild(details);
      });

      foodGroupsEl.appendChild(groupNode);
    });
  }

  function resetResult() {
    resultEl.classList.remove("is-loading");
    resultEl.textContent = "No query yet.";
    if (activeFoodButton) {
      activeFoodButton.classList.remove("is-active");
      activeFoodButton = null;
    }
  }

  function setActiveFoodButton(button) {
    if (activeFoodButton && activeFoodButton !== button) {
      activeFoodButton.classList.remove("is-active");
    }
    activeFoodButton = button;
    if (activeFoodButton) {
      activeFoodButton.classList.add("is-active");
    }
  }

  function setFoodButtonsDisabled(disabled) {
    foodGroupsEl.querySelectorAll(".food-button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function renderMatches(payload, foodLabel) {
    clearResult(resultEl);

    if (payload.dateFallbackUsed && payload.effectiveDateIso) {
      appendText(
        resultEl,
        "result-meta",
        `Showing ${foodLabel} near ${selectedDateDisplay} using nearest report date ${payload.effectiveDateIso}.`
      );
    } else {
      appendText(resultEl, "result-meta", `Showing ${foodLabel} for ${payload.city} on ${selectedDateDisplay}.`);
    }

    if (payload.cityFound === false) {
      appendText(resultEl, "result-line", `No USDA terminal market report is available for "${payload.city}".`);
      return;
    }

    if (!payload.matches.length) {
      appendText(resultEl, "result-line", "No matching report data found for this food in the selected city/date.");
      return;
    }

    payload.matches.slice(0, 4).forEach((match) => {
      const entry = document.createElement("article");
      entry.className = "result-entry";

      appendField(entry, "Origins", match.origins);
      appendField(entry, "Package", match.package);
      appendField(entry, "Item size", match.itemSize);
      appendField(entry, "Market price", match.marketPrices);
      appendField(entry, "Offerings", match.offerings);
      appendField(entry, "Quality", match.quality);

      resultEl.appendChild(entry);
    });
  }

  function renderError(error) {
    clearResult(resultEl);
    appendText(resultEl, "result-line", `Query failed: ${error}`);
  }

  async function queryFood(foodLabel, button) {
    const food = foodLabel.trim();
    if (!food) {
      return;
    }

    setLoading(resultEl, food);
    setActiveFoodButton(button);
    setFoodButtonsDisabled(true);
    try {
      const response = await fetch(
        `${proxyBase}/api/terminal-markets?food=${encodeURIComponent(food)}&city=${encodeURIComponent(selectedCity)}&date=${encodeURIComponent(selectedDateIso)}`
      );
      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body && body.error) {
            detail = body.error;
          }
        } catch (_) {
          // Ignore bad JSON in error paths.
        }
        throw new Error(detail);
      }
      const payload = await response.json();
      renderMatches(payload, food);
    } catch (error) {
      renderError(error.message || "unknown error");
    } finally {
      setFoodButtonsDisabled(false);
    }
  }

  async function initializeFoodGroups() {
    try {
      const response = await fetch("Terminal%20Market%20Foods.md", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const markdown = await response.text();
      const groups = parseFoodMarkdown(markdown);
      if (!groups.length) {
        throw new Error("No foods parsed from markdown.");
      }
      renderFoodGroups(groups);
    } catch (error) {
      console.warn("Failed to load Terminal Market Foods.md, using fallback list.", error);
      renderFoodGroups(fallbackFoodGroups);
    }
  }

  foodGroupsEl.addEventListener("click", (event) => {
    const button = event.target.closest(".food-button");
    if (!button || !foodGroupsEl.contains(button)) {
      return;
    }
    queryFood(button.dataset.food || button.textContent || "", button);
  });

  initializeDateSelection();
  initializeCitySelection();
  initializeFoodGroups();

  fetch(`${proxyBase}/api/terminal-markets/health`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setProxyStatus(`Proxy ready at ${proxyBase}`, true);
    })
    .catch(() => {
      setProxyStatus(`Proxy unavailable at ${proxyBase}. Run ./start_portfolio.sh to enable API calls.`, false);
    });
})();
