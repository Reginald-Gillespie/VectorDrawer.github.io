let data = [  0, 104, 2, 142, 140, 22, 144, 200, 200,  200,  200,  200,  200,  200  ];
let lines = [];
const scaleFactor = 80;
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
    translate(width / 2, height / 2);
}

function draw() {
    background(0);
    translate(width / 2, height / 2);
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
