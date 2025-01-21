const canvasCom = document.getElementById('lineCanvas');
const ctxCom = canvasCom.getContext('2d');

let isDragging = false;
let startX = 0;
let startY = 0;
let boidCount = 50;
let boidRadius = 5;
let boidSpacing = 10;
let boidsX = new Array(boidCount).fill(0);
let boidsY = new Array(boidCount).fill(0);
let placementCounter = 0;

// Function to calculate the length of the line
function calculateLineLength(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)).toFixed(2);
}

// Mouse down to set the starting point
canvasCom.addEventListener('mousedown', (e) => {
    startX = e.offsetX;
    startY = e.offsetY;
    isDragging = true;
});

// Mouse move to adjust the endpoint and show the line length
canvasCom.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    // Clear the canvas
    ctxCom.clearRect(0, 0, canvasCom.width, canvasCom.height);

    const endX = e.offsetX;
    const endY = e.offsetY;

    /*
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();
    */
    // Calculate the line length
    const lineLength = calculateLineLength(startX, startY, endX, endY);
    let angle = Math.atan((endY-startY) / (endX-startX)) * 180/Math.PI;
    // check if we are in quadrant 2
    if (endX < startX && endY > startY) {
        angle = angle + 180;
    } else if (endX < startX && endY < startY) {    // quadrant 3
        angle = angle + 180;
    } else if (endX > startX && endY < startY) {    // quadrant 3
        angle = angle + 360;
    } 

    // Calculate the rows and columns
    const rowCapacity = Math.min(Math.floor(lineLength / boidSpacing),boidCount);
    const numberOfColumns = Math.ceil(boidCount / rowCapacity);
    const overflow = boidCount % rowCapacity;

    // display debug info
    ctxCom.font = '14px Arial';
    ctxCom.fillStyle = 'white';
    ctxCom.fillText(`(${startX}, ${startY})`, startX + 10, startY - 10);
    ctxCom.fillText(`(${endX}, ${endY})`, endX + 10, endY - 10);
    ctxCom.fillText(`angle: ${angle}`, endX + 10, endY + 10);
    ctxCom.fillText(`Length: ${lineLength}`, endX + 10, endY + 30);
    ctxCom.fillText(`Row Capacity: ${rowCapacity}`, endX + 10, endY + 50);
    ctxCom.fillText(`Number of Columns: ${numberOfColumns}`, endX + 10, endY + 70);
    ctxCom.fillText(`Overflow: ${overflow}`, endX + 10, endY + 90);

    placementCounter = 0
    for (let i = 0; i < Math.min(numberOfColumns,boidCount); i++) {
        for (let j = 0; j < rowCapacity; j++) {
            boidsX[placementCounter] = startX + boidSpacing*j*Math.cos(angle*(Math.PI/180)) - boidSpacing*i*Math.sin(angle*(Math.PI/180));
            boidsY[placementCounter] = startY + boidSpacing*j*Math.sin(angle*(Math.PI/180)) + boidSpacing*i*Math.cos(angle*(Math.PI/180));
            placementCounter ++
        }
    }

    for (let i = 0; i < boidCount; i++) {
        // draw a boid
        ctxCom.beginPath();
        ctxCom.moveTo(boidsX[i], boidsY[i]);
        ctxCom.arc(boidsX[i], boidsY[i], boidRadius, 0, Math.PI * 2);
        ctxCom.fillStyle = "red";
        ctxCom.fill();
        ctxCom.closePath();   
    }

});

// Mouse up to finalize the line
canvasCom.addEventListener('mouseup', () => {
    isDragging = false;
});

// Stop dragging if the mouse leaves the canvas
canvasCom.addEventListener('mouseleave', () => {
    isDragging = false;
});
