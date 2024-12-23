const canvas = document.getElementById('circleCanvas');
const ctx = canvas.getContext('2d');
ctx.font = "50px Arial";

canvas.width = 700;
canvas.height = 700;
canvas.fillStyle = "rgb(255 0 0)";

class Boid {
    constructor(x, y) {
        //this.position = { x: x, y: y };
        this.position = {
            x: Math.random() * canvas.width, 
            y: Math.random() * canvas.height 
        };
        this.velocity = { 
            x: (Math.random() - 0.5) * 4, 
            y: (Math.random() - 0.5) * 4 
        };
        this.acceleration = { x: 0, y: 0 };
        this.maxSpeed = 4;
        this.maxForce = 0.1;
        this.radius = 2;
        this.perceptionRadius = 40;
        this.alignmentCoefficient = 1.0;
        this.cohesionCoefficient = 1.0;
        this.separationCoefficient = 0.1;
        this.wallAvoidanceCoefficient = 2.0;
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
            if (this !== other && this.distance(other) < this.perceptionRadius) {
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
            const scale = this.maxSpeed/magnitude;
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
            steering.x *= this.alignmentCoefficient;
            steering.y *= this.alignmentCoefficient;
        }                            
        return steering;
    }

    cohesion(boids) {
        let steering = { x: 0, y: 0 };
        let total = 0;
        for (const other of boids) {
            if (this !== other && this.distance(other) < this.perceptionRadius) {
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
            const scale = this.maxSpeed/magnitude;
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
            steering.x *= this.cohesionCoefficient;
            steering.y *= this.cohesionCoefficient;
        }
        
        return steering;
    }

    separation(boids) {
        let steering = { x: 0, y: 0 };
        let difference = { x: 0, y: 0 };
        let total = 0;
        for (const other of boids) {
            if (this !== other && this.distance(other) < this.perceptionRadius) {
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
            const scale = this.maxSpeed/magnitude;
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
            steering.x *= this.separationCoefficient;
            steering.y *= this.separationCoefficient;
        }
        
        return steering;
    }

    wallAvoidance() {
        let steering = { x: 0, y: 0 };
        let difference = { x: 0, y: 0 };
        
        // now add wall avoid component
        if (this.position.x - this.radius < this.perceptionRadius) { //|| this.position.x + this.radius > canvas.width - this.perceptionRadius) {
            difference.x = this.position.x - 0;
            steering.x += ((this.perceptionRadius - difference.x) / this.perceptionRadius) * this.maxForce;
        } else if (this.position.x + this.radius > canvas.width - this.perceptionRadius) {
            difference.x = this.position.x - canvas.width;
            steering.x += -((this.perceptionRadius - difference.x) / this.perceptionRadius) * this.maxForce;
        }

        if (this.position.y - this.radius < this.perceptionRadius) { //|| this.position.x + this.radius > canvas.width - this.perceptionRadius) {
            difference.y = this.position.y - 0;
            steering.y += ((this.perceptionRadius - difference.y) / this.perceptionRadius) * this.maxForce;
        } else if (this.position.y + this.radius > canvas.height - this.perceptionRadius) {
            difference.y = this.position.y - canvas.height;
            steering.y += -((this.perceptionRadius - difference.y) / this.perceptionRadius) * this.maxForce;
        }
        steering.x *= this.wallAvoidanceCoefficient;
        steering.y *= this.wallAvoidanceCoefficient;
        
        return steering;
    }

    update() {
        // Bounce off walls
        if (this.position.x - this.radius < 0 || this.position.x + this.radius > canvas.width) {
            this.velocity.x *= -1; // Reverse horizontal direction
        }
        if (this.position.y - this.radius < 0 || this.position.y + this.radius > canvas.height) {
            this.velocity.y *= -1; // Reverse vertical direction
        }        
        // update the velocity
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;

        // limit the velocity
        const magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (magnitude > this.maxSpeed) {
            const scale = this.maxSpeed/magnitude;
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
        const greenChannel = ((this.maxSpeed - velocityMagnitude) / this.maxSpeed) * 255;
        const redChannel = 255 - greenChannel;
        
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${redChannel} ${greenChannel} 0)`;
        ctx.fill();
        ctx.closePath();
    }
}

const boids = [];
for (let i = 0; i < 200; i++) {
    boids.push(new Boid());
}

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

    requestAnimationFrame(animate);
}

animate();