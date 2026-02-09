(() => {
  const params = new URLSearchParams(window.location.search);
  const proxyBase = (params.get("proxy") || "http://localhost:8070").replace(/\/+$/, "");

  const statusEl = document.getElementById("proxy-status");
  const foodButtons = Array.from(document.querySelectorAll(".food-button"));
  const cityButtons = Array.from(document.querySelectorAll(".city-button"));
  const resultPanels = Array.from(document.querySelectorAll(".food-result"));
  const yearSelect = document.getElementById("year-select");
  const dateSlider = document.getElementById("date-slider");
  const selectedDateEl = document.getElementById("selected-date");
  let selectedCity = "";
  let selectedDateIso = "";
  let selectedDateDisplay = "";

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
      resetAllResults();
    });
    yearSelect.addEventListener("change", () => {
      dateSlider.max = String((isLeapYear(Number(yearSelect.value)) ? 366 : 365) - 1);
      if (Number(dateSlider.value) > Number(dateSlider.max)) {
        dateSlider.value = dateSlider.max;
      }
      updateSelectedDate();
      resetAllResults();
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
        resetAllResults();
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

  function resetAllResults() {
    resultPanels.forEach((panel) => {
      panel.classList.remove("is-loading");
      panel.textContent = "No query yet.";
    });
  }

  function renderMatches(resultEl, payload) {
    clearResult(resultEl);

    const meta = document.createElement("small");
    meta.className = "result-meta";
    const fallbackSuffix =
      payload.dateFallbackUsed && payload.effectiveDateIso
        ? ` No exact report for ${selectedDateIso}; showing closest available report dated ${payload.effectiveDateIso}.`
        : "";
    meta.textContent = `Scanned ${payload.reportsScanned} terminal reports in ${payload.category} for ${payload.city}. Date filter: ${selectedDateIso}.${fallbackSuffix}`;
    resultEl.appendChild(meta);

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

      appendText(entry, "result-head", `${match.market} | ${match.publishedDate}`);
      appendField(entry, "Origins", match.origins);
      appendField(entry, "Package", match.package);
      appendField(entry, "Item size", match.itemSize);
      appendField(entry, "Market prices", match.marketPrices);
      appendField(entry, "Offerings", match.offerings);
      appendField(entry, "Quality", match.quality);
      if (match.sourceSnippet) {
        appendText(entry, "result-snippet", match.sourceSnippet);
      }

      if (match.reportUrl) {
        const link = document.createElement("a");
        link.className = "result-link";
        link.href = match.reportUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open USDA report text";
        entry.appendChild(link);
      }

      resultEl.appendChild(entry);
    });
  }

  function renderError(resultEl, error) {
    clearResult(resultEl);
    appendText(resultEl, "result-line", `Query failed: ${error}`);
  }

  async function queryFood(food, button, resultEl) {
    setLoading(resultEl, food);
    button.disabled = true;
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
      renderMatches(resultEl, payload);
    } catch (error) {
      renderError(resultEl, error.message || "unknown error");
    } finally {
      button.disabled = false;
    }
  }

  initializeDateSelection();
  initializeCitySelection();

  foodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const food = button.dataset.food;
      const resultEl = document.getElementById(`result-${food}`);
      if (!resultEl) {
        return;
      }
      queryFood(food, button, resultEl);
    });
  });

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
