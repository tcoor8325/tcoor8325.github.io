//var currentValueAlignment = 0;
//var currentValueCohesion = 0;
//var currentValueSeparation = 0;
var currentValues = [0,0,0,1];
document.addEventListener("DOMContentLoaded", () => {
  const sliders = document.querySelectorAll(".slider-container");
  const circles = [document.getElementById("circle-1"), document.getElementById("circle-2"), document.getElementById("circle-3"), document.getElementById("circle-4")];
  const valueDisplays = [document.getElementById("slider-value-1"), document.getElementById("slider-value-2"), document.getElementById("slider-value-3"), document.getElementById("slider-value-4")];

  const min = 0;
  const max = 100;
  //var currentValue = [0,0,0];
  sliders.forEach((sliderContainer, index) => {
    const sliderTrack = sliderContainer.querySelector(".slider-track");
    const sliderThumb = sliderContainer.querySelector(".slider-thumb");
    const trackRect = sliderTrack.getBoundingClientRect();

    const updateSlider = (clientX) => {
      let offsetX = clientX - 680;
      offsetX = Math.max(0, Math.min(offsetX, 300)); // Clamp within track bounds

      currentValues[index] = Math.round((offsetX / 300) * (max - min));
      if (currentValues[3]==0) {
        currentValues[3]=1;
      }
      valueDisplays[index].textContent = currentValues[index];

      

      sliderThumb.style.left = `${(offsetX / 300) * 100}%`;

      // Update the corresponding circle's size
      const diameter = 50 + currentValues[index]; // Base size + slider value
      circles[index].style.width = `${diameter}px`;
      circles[index].style.height = `${diameter}px`;
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
});
