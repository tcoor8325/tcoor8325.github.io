function animate() {

    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0 0 0)";
    ctx.fill();
    ctx.stroke();
    
    for (const boid of boids) {
        boid.flock(boids);
        boid.update();
        boid.draw();
    }

    /*
    c_ctx.rect(0, 0, c_canvas.width, c_canvas.height);
    c_ctx.fillStyle = "rgb(0 0 0)";
    c_ctx.fill();
    c_ctx.stroke();
    */
    

    requestAnimationFrame(animate);
}

animate();