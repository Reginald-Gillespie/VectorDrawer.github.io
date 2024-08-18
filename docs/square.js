let x = 0;
let speed = 2;

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
}

function draw() {
    background(220);
    rect(x, height / 2 - 25, 50, 50);
    x += speed;
    if (x > width || x < 0) {
        speed *= -1; // Reverse direction
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
