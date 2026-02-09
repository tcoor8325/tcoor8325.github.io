const songButtons = Array.from(document.querySelectorAll(".song-link")); // Song list buttons
const songEntries = Array.from(document.querySelectorAll(".song-entry")); // Song entry panels
function setActiveSong(songId) { // Set active song entry
  songEntries.forEach((entry) => { // Iterate song entries
    const isMatch = entry.id === songId; // Match flag
    entry.classList.toggle("is-active", isMatch); // Toggle entry visibility
  }); // End song entry loop
  songButtons.forEach((button) => { // Iterate song buttons
    const isMatch = button.dataset.song === songId; // Match flag
    button.classList.toggle("is-active", isMatch); // Toggle button state
  }); // End song button loop
} // End setActiveSong
if (songButtons.length > 0 && songEntries.length > 0) { // Song list exists
  songButtons.forEach((button) => { // Iterate song buttons
    button.addEventListener("click", () => { // Song button click
      const songId = button.dataset.song; // Target song id
      if (songId) { // Valid song id
        setActiveSong(songId); // Activate song
      } // End id check
    }); // End song button click
  }); // End song button loop
  const initialButton = songButtons.find((button) => button.classList.contains("is-active")) || songButtons[0]; // Initial button
  if (initialButton && initialButton.dataset.song) { // Initial song exists
    setActiveSong(initialButton.dataset.song); // Activate initial song
  } // End initial song check
} // End song list guard
