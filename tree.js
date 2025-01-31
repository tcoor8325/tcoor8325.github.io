const canvas = document.getElementById('cumCanvas');
const ctx = canvas.getContext('2d');

//canvas.width = 1600;
//canvas.height = 1000;

let isDrawing = false;

ctx.font = '10px Arial';
canvas.fillStyle = "green;";
ctx.strokeStyle= 'brown';
ctx.lineWidth = 2;

let lenD = 0.8;

ctx.beginPath();
ctx.fillStyle = "rgb(101, 219, 71)";
ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.stroke();
function draw(startX, startY, len, angle, branchWidth) {
    ctx.lineWidth = branchWidth;

    ctx.beginPath();
    ctx.save();

    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.translate(startX, startY);
    ctx.rotate(angle * Math.PI/180);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();


    if(len < 5) {
        // draw some leaves
        ctx.fillStyle = "rgb(255, 112, 243)";
        ctx.fillRect(5,5,5,5);
        ctx.stroke();
        ctx.restore();
        return;
    }
    let angleMax = 20;
    let angleMin = 0;
    let lenMax = 0.90;
    let lenMin = 0.5;
    let branchWidthMax = 0.95;
    let branchWidthMin = 0.5;

    let lenV = (Math.random()*(lenMax-lenMin)+lenMin);           // branch length decreases by 10-50% per level
    let angleV = 360*(Math.random()*((angleMax/360)-angleMin)+angleMin);         // angle changes by a between 0 and 60deg      
    let branchWidthV = (Math.random()*(branchWidthMax-branchWidthMin)+branchWidthMin);   // branch widht decreases by 10-30%

    draw(0, -len, len*lenV, angle-angleV, branchWidth*branchWidthV);

    lenV = (Math.random()*(lenMax-lenMin)+lenMin);           // branch length decreases by 10-50% per level
    angleV = 360*(Math.random()*((angleMax/360)-angleMin)+angleMin);         // angle changes by a between 0 and 60deg      
    branchWidthV = (Math.random()*(branchWidthMax-branchWidthMin)+branchWidthMin);   // branch widht decreases by 10-30%

    draw(0, -len, len*lenV, angle+angleV, branchWidth*branchWidthV);

    ctx.restore();
}
//draw(300, 600, 150, 0, 10);

//ctx.fillText(`(${length},${Math.round(angle)})`,x,y);
//branch(length,angle);


canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;   
    // this is the trunk
    [lastX, lastY] = [e.offsetX, e.offsetY];    // get the position of the click
    //ctx.fillText(`(${lastX},${lastY})`,lastX,lastY);
    ctx.beginPath();
    ctx.fillStyle = "rgb(101, 219, 71)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.stroke();
    draw(lastX, lastY, 150, 0, 10);
});

// Stop drawing
canvas.addEventListener('mouseup', () => {
    // reset the start values
    isDrawing = false;
    length = 100;
    angle = 30*(Math.PI/180); 
});

// If the mouse leaves the canvas, stop drawing
canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
});

// Draw on the canvas
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

   

    [lastX, lastY] = [e.offsetX, e.offsetY];
});
