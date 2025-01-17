// script.js
const canvas = document.getElementById('circleCanvas');
const ctx = canvas.getContext('2d');

ctx.font = "50px Arial";
canvas.width = 500;
canvas.height = 700;
canvas.fillStyle = "rgb(255 0 0)";

let isDragging = false;
let startX, startY;

// Create a block 
class Block {
    constructor(x, y) {
        //this.position = { x: x, y: y };
        this.position = {
            x: Math.random() * canvas.width, 
            y: Math.random() * canvas.height 
        };
        this.radius = 20;
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.closePath();
    }
}

// Function to draw a rectangle
function drawRectangle(x, y, width, height) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'blue';
    ctx.fillRect(x, y, width, height);
}

let rect = { x: 100, y: 100, width: 100, height: 100 };
//drawRectangle(rect.x, rect.y, rect.width, rect.height);
let boidCount = 1;
let boidSpacing = 5;
let boidRadius = 20;

canvas.addEventListener('mousedown', (e) => {
    const rectBounds = canvas.getBoundingClientRect();
    startX = e.clientX - rectBounds.left;
    startY = e.clientY - rectBounds.top;

   
    // Check if the click is inside the rectangle
    /*
    if (
        startX >= rect.x &&
        startX <= rect.x + rect.width &&
        startY >= rect.y &&
        startY <= rect.y + rect.height
    ) {
        isDragging = true;
    }
    */
    isDragging = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rectBounds = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rectBounds.left;
    const mouseY = e.clientY - rectBounds.top;

    const dx = mouseX - startX;
    const dy = mouseY - startY;

    rect.x += dx;
    rect.y += dy;

    //startX = mouseX;
    //startY = mouseY;

    // Start a new Path
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(mouseX, mouseY);

    // Draw the Path
    ctx.stroke();

    // Calculate number of rows, columns, and remainder
    // Calculate length of dragged line
    const lineLength = Math.sqrt( Math.pow((mouseX-startX),2) + Math.pow((mouseY-startY),2));
    const slope = (mouseY-startY) - (mouseX-startX);
    // Draw the boid target positions
    const rowLength = lineLength / boidRadius;
    
    for (let i = 0; i < boidCount; i++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.arc(startX, startY, boidRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.closePath();
    }
    
    // the length of the line divided by the boid spacing is the max number of boids that can fit in each row. 
    // Start at startX,Y. 

    // place a boid. 
    // if boidCounter is less than the number of boids, then proceed to the next boid position
    // Loop through the rows
    
    //      Loop through the columns
}); 

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

const blocks = [];
for (let i = 0; i < 1; i++) {
    blocks.push(new Block());
}

function animate() {
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(255 255 255)";
    ctx.fill();
    ctx.stroke();
    //drawRectangle(rect.x, rect.y, rect.width, rect.height);

    //for (const block of blocks) {
    //    block.draw();
    //}
    requestAnimationFrame(animate);
}

animate();
