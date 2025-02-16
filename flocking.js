const canvasFlo = document.getElementById('circleCanvas');
const ctxFlo = canvasFlo.getContext('2d');
ctxFlo.font = "50px Arial";

//canvas.width = 700;
//canvas.height = 700;
canvasFlo.fillStyle = "rgb(255 0 0)";

// globals
maxSpeed = 5;
alignmentCoefficient = 0.5;
cohesionCoefficient = 0.4;
separationCoefficient = 0.05;
perceptionRadius = 100;
/*
maxForce = 0.4;
wallRepelForce = 1.0;
radius = 20;
perceptionRadius = 100;
alignmentCoefficient = 0.5;
cohesionCoefficient = 0.4;
this.separationCoefficient = 0.05;
*/

class Boid {
    constructor(x, y) {
        //this.position = { x: x, y: y };
        this.position = {
            x: Math.random() * canvasFlo.width, 
            y: Math.random() * canvasFlo.height 
        };
        this.velocity = { 
            x: (Math.random() - 0.5) * 4, 
            y: (Math.random() - 0.5) * 4 
        };
        this.acceleration = { x: 0, y: 0 };
        this.maxForce = 0.4;
        this.wallRepelForce = 1.0;
        this.radius = 5;
        //this.perceptionRadius = 100;
        //this.alignmentCoefficient = 0.5;
        //this.cohesionCoefficient = 0.4;
        //this.separationCoefficient = 0.05;
    }

    distance(other) {
        return Math.sqrt(
            (this.position.x - other.position.x) ** 2 +
            (this.position.y - other.position.y) ** 2
        );
    }

    align(boids) {
        let steering = { x: 0, y: 0 };
        let total = 0;
        for (const other of boids) {
            if (this !== other && this.distance(other) < perceptionRadius) {
                steering.x += other.velocity.x;
                steering.y += other.velocity.y;
                total++;
                //ctx.beginPath();
                //ctx.moveTo(this.position.x, this.position.y);
                //ctx.lineTo(other.position.x, other.position.y);                                    
                //ctx.stroke();
            }
        }
        if (total > 0) {
            steering.x /= total;
            steering.y /= total;
            const magnitude = Math.sqrt(steering.x ** 2 + steering.y ** 2);
            const scale = maxSpeed/magnitude;
            //ctx.fillText(scale.toPrecision(3),this.position.x,this.position.y-10);
            // set the magnitude of steering to the max speed
            steering.x *= scale;
            steering.y *= scale;
            // subtract out the current velocity
            steering.x -= this.velocity.x;
            steering.y -= this.velocity.y;
            // limit the steering
            steering.x = (steering.x / magnitude) * this.maxForce;
            steering.y = (steering.y / magnitude) * this.maxForce;
            //apply the coefficient
            steering.x *= alignmentCoefficient;
            steering.y *= alignmentCoefficient;
        }                            
        return steering;
    }

    cohesion(boids) {
        let steering = { x: 0, y: 0 };
        let total = 0;
        for (const other of boids) {
            if (this !== other && this.distance(other) < perceptionRadius) {
                // Here, steering holds the position of the average (the center of mass)
                steering.x += other.position.x;
                steering.y += other.position.y;
                total++;
            }
        }
        if (total > 0) {
            steering.x /= total;
            steering.y /= total;
            steering.x = steering.x - this.position.x;
            steering.y = steering.y - this.position.y;
            const magnitude = Math.sqrt(steering.x ** 2 + steering.y ** 2);
            const scale = maxSpeed/magnitude;
            // set the magnitude of steering to the max speed
            steering.x *= scale;
            steering.y *= scale;
            // subtract out the current velocity
            steering.x -= this.velocity.x;
            steering.y -= this.velocity.y;
            // limit the steering
            steering.x = (steering.x / magnitude) * this.maxForce;
            steering.y = (steering.y / magnitude) * this.maxForce;
            //apply the coefficient
            steering.x *= cohesionCoefficient;
            steering.y *= cohesionCoefficient;
        }
        
        return steering;
    }

    separation(boids) {
        let steering = { x: 0, y: 0 };
        let difference = { x: 0, y: 0 };
        let total = 0;
        for (const other of boids) {
            if (this !== other && this.distance(other) < perceptionRadius) {
                // find the difference between this and the other boid's positions
                difference.x = this.position.x - other.position.x;
                difference.y = this.position.y - other.position.y;
                // we want closer boids to have more effect, so multiply the difference by 1/ the distance
                difference.x *= 1/(this.distance(other));
                difference.y *= 1/(this.distance(other));
                // find the steering vector
                steering.x += difference.x;
                steering.y += difference.y;
                total++;
            }
        }            
        
        if (total > 0) {
            steering.x /= total;
            steering.y /= total;
            const magnitude = Math.sqrt(steering.x ** 2 + steering.y ** 2);
            const scale = maxSpeed/magnitude;
            // set the magnitude of steering to the max speed
            steering.x *= scale;
            steering.y *= scale;
            // subtract out the current velocity
            steering.x -= this.velocity.x;
            steering.y -= this.velocity.y;
            // limit the steering
            steering.x = (steering.x / magnitude) * this.maxForce;
            steering.y = (steering.y / magnitude) * this.maxForce;
            //apply the coefficient
            steering.x *= separationCoefficient;
            steering.y *= separationCoefficient;
        }
        
        return steering;
    }

    wallAvoidance() {
        let steering = { x: 0, y: 0 };
        let difference = { x: 0, y: 0 };
        
        // now add wall avoid component
        // if the boid is within perception radius of the left wall,
        if (this.position.x - this.radius < perceptionRadius) { //|| this.position.x + this.radius > canvas.width - this.perceptionRadius) {
            // calculate the distance to the wall
            difference.x = this.position.x - 0;
            // the steering vector will be made from 
            steering.x += ((perceptionRadius - difference.x) / perceptionRadius) * this.wallRepelForce;
        } else if (this.position.x + this.radius > canvasFlo.width - perceptionRadius) {
            difference.x = canvasFlo.width - this.position.x;
            steering.x += -((perceptionRadius - difference.x) / perceptionRadius) * this.wallRepelForce;
        }

        if (this.position.y - this.radius < perceptionRadius) { //|| this.position.x + this.radius > canvas.width - this.perceptionRadius) {
            difference.y = this.position.y - 0;
            steering.y += ((perceptionRadius - difference.y) / perceptionRadius) * this.wallRepelForce;
        } else if (this.position.y + this.radius > canvasFlo.height - perceptionRadius) {
            difference.y = canvasFlo.height - this.position.y;
            steering.y += -((perceptionRadius - difference.y) / perceptionRadius) * this.wallRepelForce;
        }
        //steering.x *= this.wallAvoidanceCoefficient;
        //steering.y *= this.wallAvoidanceCoefficient;
        
        return steering;
    }

    update() {
        // Bounce off walls
        if (this.position.x - this.radius < 0 || this.position.x + this.radius > canvasFlo.width) {
            this.velocity.x *= -1; // Reverse horizontal direction
        }
        if (this.position.y - this.radius < 0 || this.position.y + this.radius > canvasFlo.height) {
            this.velocity.y *= -1; // Reverse vertical direction
        }        
        // update the velocity
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;

        // limit the velocity
        const magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (magnitude > maxSpeed) {
            const scale = maxSpeed/magnitude;
            // set the magnitude of steering to the max speed
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }

    applyForce(force) {
        this.acceleration.x += force.x;
        this.acceleration.y += force.y;
    }

    flock(boids) {

        const alignment = this.align(boids);
        const cohesion = this.cohesion(boids);
        const separation = this.separation(boids);
        const wallAvoidance = this.wallAvoidance();

        this.applyForce(alignment);
        this.applyForce(cohesion);
        this.applyForce(separation);
        this.applyForce(wallAvoidance);
    }

    draw() {
        const velocityMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);            
        const greenChannel = ((maxSpeed - velocityMagnitude) / maxSpeed) * 255;
        const redChannel = 255 - greenChannel;
        
        ctxFlo.beginPath();
        ctxFlo.moveTo(this.position.x, this.position.y);
        ctxFlo.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctxFlo.fillStyle = `rgb(${redChannel} ${greenChannel} 0)`;
        ctxFlo.fill();
        ctxFlo.closePath();
    }
}

const boids = [];
for (let i = 0; i < 100; i++) {
    boids.push(new Boid());
}


function animate() {
    alignmentCoefficient = currentValues[0] / 200;
    cohesionCoefficient = currentValues[1] / 250;
    separationCoefficient = currentValues[2] / 2000;
    perceptionRadius = currentValues[3];
    ctxFlo.rect(0, 0, canvasFlo.width, canvasFlo.height);
    ctxFlo.fillStyle = "rgb(0 0 0)";
    ctxFlo.fill();
    ctxFlo.stroke();
    
    for (const boid of boids) {
        boid.flock(boids);
        boid.update();
        boid.draw();
    }

    requestAnimationFrame(animate);
}

animate();