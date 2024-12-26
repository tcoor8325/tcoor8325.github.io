// script.js
document.addEventListener('DOMContentLoaded', () => {
  const setupTabSwitching = (buttonSelector, panelSelector, activeClass) => {
    const buttons = document.querySelectorAll(buttonSelector);
    const panels = document.querySelectorAll(panelSelector);

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove 'active' class from all buttons and panels
        buttons.forEach(btn => btn.classList.remove(activeClass));
        panels.forEach(panel => panel.classList.remove(activeClass));

        // Add 'active' class to the clicked button and corresponding panel
        button.classList.add(activeClass);
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add(activeClass);
      });
    });
  };

  // Main tabs
  setupTabSwitching('.tab-button', '.tab-panel', 'active');
  
  // Nested tabs in Tab 1
  setupTabSwitching('.nested-tab-button', '.nested-tab-panel', 'active');

  // Nested tabs in Projects
  setupTabSwitching('.projects-nested-tab-button', '.projects-nested-tab-panel', 'active');
});
