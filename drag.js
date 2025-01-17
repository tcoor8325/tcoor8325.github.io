const dragBox = document.getElementById("dragBox");

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

var display = document.getElementById("dragBox");

dragBox.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - dragBox.offsetLeft;
  offsetY = e.clientY - dragBox.offsetTop;
  dragBox.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  dragBox.style.left = `${e.clientX - offsetX}px`;
  dragBox.style.top = `${e.clientY - offsetY}px`;
  display.innerHTML = `${e.clientX - offsetX} ${e.clientY - offsetY}`;
  //document.getElementById("dragBox").innerHTML = dragBox.style.right;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  dragBox.style.cursor = "grab";
});
