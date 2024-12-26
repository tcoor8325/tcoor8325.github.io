const projectsTabs = document.querySelectorAll('[project-tab-target]')
const tabContents = document.querySelectorAll('[project-tab-content]')

projectsTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = document.querySelector(tab.dataset.tabTarget)
    projectsTabContents.forEach(tabContent => {
      tabContent.classList.remove('active')
    })
    projectsTabs.forEach(tab => {
      tab.classList.remove('active')
    })
    tab.classList.add('active')
    target.classList.add('active')
  })
})