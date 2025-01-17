/* Paste this in Styles
#box1, #box2 {
        position: absolute;
}
#box1 {
    width: 50px;
    height: 50px;
    background-color: red;
    top: 20px;
    left: 20px;
}
#box2 {
    width: 30px;
    height: 30px;
    background-color: blue;
    top: 200px;
    left: 200px;
    border-radius: 50%;
}
*/



/* Paste this above the call to script
<div id="box1"></div>
<div id="box2"></div>
*/
const box1 = document.getElementById('box1');
const box2 = document.getElementById('box2');

let box1X = 20;
let box1Direction = 1;

function animateBox1() {
    if (box1X > window.innerWidth - 50 || box1X < 0) {
        box1Direction *= -1;
    }
    box1X += 2 * box1Direction;
    box1.style.left = box1X + 'px';
    requestAnimationFrame(animateBox1);
}

let box2Angle = 0;

function animateBox2() {
    box2Angle += 2;
    const x = 150 * Math.cos(box2Angle * Math.PI / 180) + window.innerWidth / 2;
    const y = 150 * Math.sin(box2Angle * Math.PI / 180) + window.innerHeight / 2;
    box2.style.left = x + 'px';
    box2.style.top = y + 'px';
    requestAnimationFrame(animateBox2);
}

animateBox1();
animateBox2();