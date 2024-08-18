let data = [  31, 133,  113,  111,  141,  144,  104,  100,  140,  200,  200,  200,  200,  200  ];
let lines = [];
const scaleFactor = 130;
const xScaleFactor = scaleFactor/2;
const boxHeight = scaleFactor*4;
const boxWidth = boxHeight/2;
const offsetX = 0;
const offsetY = 0;

// TODO: compress x in slightly

function decodeData() {
    let currentPoint = { x: 0, y: 0 };

    for (let i = 0; i < data.length; i++) {
        let value = data[i];
        let draw = Math.floor(value / 100) == 1;
        let x = Math.floor(value / 10) % 10;
        let y = value % 10;

        if (value === 200) {
            continue;
        }
        
        if (draw) {
            // TODO read y coords flipped and render normally
            const startPoint = [currentPoint.x * xScaleFactor - boxWidth / 2, -currentPoint.y * scaleFactor + boxHeight / 2];
            currentPoint.x = x;
            currentPoint.y = y;
            const endPoint = [currentPoint.x * xScaleFactor - boxWidth / 2, -currentPoint.y * scaleFactor + boxHeight / 2];

            lines.push([startPoint, endPoint]);
        } else {
            // Update start position
            currentPoint.x = x;
            currentPoint.y = y;
        }
    }
}

function rgb(...input) {
    // Just a quick function so my color picker extension picks up on my color input
    return color(...input);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noLoop();
    decodeData();
    translate(width / 2, height / 2); // Draw everything from the center
}

function draw() {
    background(0);
    translate(width / 2, height / 2);
    drawRibbon();
    drawOutlineBox();
    renderLines();
}

function renderLines() {
    noFill();
    stroke( rgb(152, 162, 168));
    strokeWeight(10);

    for (let lineCoords of lines) {
        line(...lineCoords.flat(1));
    }
}

function drawOutlineBox() {
    noFill();
    stroke(0);
    strokeWeight(1);
    rectMode(CENTER);
    rect(0, 0, boxWidth, boxHeight);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function drawRibbon() {
    const width = 1200;
    const height = 600;
    const numTriangles = 5;
    const trianglePointSize = 25;

    // Center rect
    fill(rgb(90, 72, 141));
    noStroke();
    rectMode(CENTER);
    rect(0, 0, width, height);

    // Render triangles
    const triangleSpacing = height/numTriangles;
    const triXStart = -width/2;
    const triYStart = -height/2;
    for (var i = 0; i < numTriangles; i++) {
        const thisTriStartY = triYStart + (triangleSpacing * i);
        const thisTriEndY = triYStart + (triangleSpacing * (i+1));

        // Left
        triangle(
            ...[triXStart, thisTriStartY],
            ...[triXStart, thisTriEndY],
            ...[triXStart-trianglePointSize, (thisTriStartY+thisTriEndY)/2], // point is in the center
        )

        // Right
        triangle(
            ...[-triXStart, thisTriStartY],
            ...[-triXStart, thisTriEndY],
            ...[-(triXStart-trianglePointSize), (thisTriStartY+thisTriEndY)/2], // point is in the center
        )
    }
}
