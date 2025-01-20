var currentValueAlignment = 0;
document.addEventListener("DOMContentLoaded", () => {
  const sliderTrack = document.querySelector(".slider-track");
  const sliderThumb = document.querySelector(".slider-thumb");
  const sliderValueDisplay = document.getElementById("slider-value");
  const dynamicCircle = document.getElementById("dynamic-circle");

  const trackRect = sliderTrack.getBoundingClientRect();
  const min = 0;
  const max = 100;
  //var currentValue = 0;

  const updateSlider = (clientX) => {
    let offsetX = clientX - 680;
    offsetX = Math.max(0, Math.min(offsetX, 300)); // Clamp within track bounds

    //currentValue = Math.round((offsetX / trackRect.width) * (max - min));
    currentValueAlignment = Math.round((offsetX / 300) * (max - min));
    //sliderValueDisplay.textContent = currentValue;
    sliderValueDisplay.textContent = currentValueAlignment;
    // trackRect.width - the size of the slider track (starts at 0, DOES NOT CHANGE)
    // trackRect.left - appears to be the same

    sliderThumb.style.left = `${(offsetX / 300) * 100}%`;

    // Update the circle's diameter based on the slider value
    const diameter = 50 + currentValueAlignment; // Base size + slider value
    dynamicCircle.style.width = `${diameter}px`;
    dynamicCircle.style.height = `${diameter}px`;
  };

  sliderThumb.addEventListener("mousedown", (event) => {
    const onMouseMove = (e) => {
      updateSlider(e.clientX);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    event.preventDefault(); // Prevent text selection
  });

  // Optional: Update slider on track click
  sliderTrack.addEventListener("click", (event) => {
    updateSlider(event.clientX);
  });
});
