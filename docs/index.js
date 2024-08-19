let data = [  0,  104,    2,  142,   44,  140,  200,  200,  200,  200,  200,  200,  200,  200  ]; // placeholder
let lines = [];
let lastData = JSON.stringify(data);
let lastLines = JSON.stringify(lines);
let holes = [];
const scaleFactor = 130;
const xFractOfY = 1.5;
const xScaleFactor = scaleFactor/xFractOfY;
const boxHeight = scaleFactor*4;
const boxWidth = boxHeight/xFractOfY;
const boxPixelExpandBuffer = 11;
const offsetX = 0;
const offsetY = 0;
var lastHoveredHole = null;
const bufferSlots = 14; // We need to fill up the extra space to make 14 cells - it it has to it will go above this but it can't go below it

// TODO: 
// Detect if highlighted area is part of an already established line, delete that and split the line into two parts if so
// Better way to delete lines

function sortLinesOptimally(lines) {
    // Brute-force solution to find the most ideal solution to draw these lines with the least amount of pen-lifts
    const permutations = getPermutations(lines.map((line, index) => [index, line]));
    let minDistance = Infinity;
    let optimalSequence = [];

    for (const perm of permutations) {
        const sequence = [];
        let totalDistance = 0;
        let currentPoint = null;

        for (let i = 0; i < perm.length; i++) {
            let [index, line] = perm[i];
            let [start, end] = line;
            if (currentPoint) {
                const distStart = distance(currentPoint, start);
                const distEnd = distance(currentPoint, end);

                if (distEnd < distStart) {
                    [start, end] = [end, start];
                    totalDistance += distEnd;
                } else {
                    totalDistance += distStart;
                }
            }
            else {
                totalDistance += 0;
            }
            sequence.push([[...start], [...end]]);
            currentPoint = end;
        }

        if (totalDistance < minDistance) {
            minDistance = totalDistance;
            optimalSequence = sequence;
        }
    }

    return optimalSequence;
}

function getPermutations(arr) {
    if (arr.length === 0) return [[]];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
        const perms = getPermutations(remaining);
        for (const perm of perms) {
            result.push([current, ...perm]);
        }
    }
    return result;
}

function distance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (Array.isArray(arr1[i]) && Array.isArray(arr2[i])) {
            if (!arraysEqual(arr1[i], arr2[i])) return false;
        } else if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

function decodeData(ignoreInput=false) {
    console.log("Parsing")
    var parsedInput = null;
    try {
        const input = "[" + select('#inputField')?.value().match(/[\d\,]/g).join("") + "]"; // Filter parse it to handle anomalies  
        parsed = JSON.parse(input);
        select('#inputField').value(JSON.stringify(parsed, null, 1).replaceAll("[", "{").replaceAll("]", "}"));
    } catch {}

    data = ignoreInput ? data : parsed || data;

    let currentPoint = { x: 0, y: 0 };

    lines = [];
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

function hasDataOrLinesChanged() {
    const dataStringified = JSON.stringify(data);
    const linesStringified = JSON.stringify(lines);
    if (lastData !== dataStringified || lastLines !== linesStringified) {
        lastLines = linesStringified;
        lastData = dataStringified;
        return true;
    }
    return false;
}

function encodeAndWrite() {
    var exportedData = []
    var lastEnd = [-1,-1];

    // Make sure either data or lines changed
    if (!hasDataOrLinesChanged()) return;

    // Sort the lines so that the drawing can draw fastest and with the least amount of lifts
    const efficientLines = sortLinesOptimally(lines);

    for (var l of efficientLines) {
        // const [startPoint, endPoint] = l;
        const [endPoint, startPoint] = l; // Reversing this makes it export the same way as the hack pack one imports

        var [lsX, lsY] = getLabelXYByGraphicalXY(...startPoint);
        var [leX, leY] = getLabelXYByGraphicalXY(...endPoint);

        // If we're not already at the start point, we need to add a move to it first
        if (!arraysEqual(startPoint, lastEnd)) {
            exportedData.push(  (+lsX)*10  +  (+lsY)  )
        }

        // Now push a move to the end point
        exportedData.push(  100  +  (+leX)*10  +  (+leY)  )

        // Record end point in case we can link the lines
        lastEnd = endPoint;
    }

    // Now push 200's into the leftover spaces
    for (var needToFill = bufferSlots - exportedData.length; needToFill-- > 0;) exportedData.push(200)

    // Convert to C format
    const CFormatData = JSON.stringify(exportedData, null, 1).replaceAll("[", "{").replaceAll("]", "}")

    // Export data
    select('#inputField').value(CFormatData);
    lastExport = CFormatData;

}

function calculateHoles() {
    const lockNum = 5;
    const startX = -boxWidth / 2;
    const xPointDist = boxWidth / (lockNum-1);
    const startY = -boxHeight / 2;
    const yPointDist = boxHeight / (lockNum-1);
    for (var x = 0; x < lockNum; x++) {
        for (var y = 0; y < lockNum; y++) {
            const pointX = startX + (xPointDist*x);
            const pointY = startY + (yPointDist*y);
            holes.push({x:pointX, y:pointY, active:false, labelMakerX:x, labelMakerY:y })
        }
    }
}

function getLabelXYByGraphicalXY(x, y) {
    for (var hole of holes) {
        if (
            hole.x == x &&
            hole.y == y
        ) return [hole.labelMakerX, hole.labelMakerY]
    }
}

function rgb(...input) {
    // Just a quick function so my color picker extension picks up on my color input
    return color(...input);
}

function renderLockHoles() {
    noFill();
    stroke(0);
    strokeWeight(4);
    // There are 5 slots up and down
    for (let hole of holes) {
        point(hole.x, hole.y);
    }
}

function renderLines() {
    noFill();
    stroke( rgb(152, 162, 168));
    strokeWeight(20);

    for (let lineCoords of lines) {
        line(...lineCoords.flat(1));
    }
}

function drawOutlineBox() {
    noFill();
    stroke(0);
    strokeWeight(1);
    rectMode(CENTER);
    rect(0, 0, boxWidth+boxPixelExpandBuffer*2, boxHeight+boxPixelExpandBuffer*2);
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

function getActiveHole() {
    for (var hole of holes) {
        if (hole.active) {
            return hole;
        }
    }
    return null;
}

function getHoveredHole() {
    // TODO: instead of get for active and hovered, getting both at the same time would be more efficient 
    for (var hole of holes) {
        if (hole.hovered) {
            return hole;
        }
    }
    return null;
}

function circleFocusedHoles() {
    // An alternative method would be to save the inside hole, render the circle and blit that image of the hole before over the ellipse 
    function circleHole(x, y) {
        let outerRadius = 15;
        stroke(50);
        strokeWeight(3);
        beginShape();
        for (let angle = 0; angle < 360; angle += 1) {
            let outerX = x + cos(radians(angle)) * outerRadius;
            let outerY = y + sin(radians(angle)) * outerRadius;
            vertex(outerX, outerY);
        }
        endShape(CLOSE);
    }

    const activeHole = getActiveHole();
    if (activeHole) circleHole(activeHole.x, activeHole.y);

    const hoveredHole = getHoveredHole();
    if (hoveredHole) circleHole(hoveredHole.x, hoveredHole.y);
}

function getInRangePoint() {
    const pointRadius = 15;
    for (let p of holes) {
        const absolutePointPos = [width/2 + p.x, height/2 + p.y]
        if (dist(mouseX, mouseY, ...absolutePointPos) <= pointRadius) {
            return p;
        }
    }
}

function drawLineToCursor() {
    const activeHole = getActiveHole();
    if (activeHole) {
        noFill();
        stroke( rgb(152, 162, 168));
        strokeWeight(20);

        const startPoint = [activeHole.x, activeHole.y];
        const endPoint = [mouseX - width/2, mouseY - height/2];

        line(...startPoint, ...endPoint)
    }
}

// Non P5.js events

function handleInputChange() {
    decodeData()
}

function deleteButtonPressed() {
    console.log("Delete button")
    data = (new Array(bufferSlots)).fill(200);
    decodeData(true);
    draw();
}


// P5.js event functions

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    translated = false;
    draw();
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    // createCanvas(windowWidth, windowHeight, p5.WEBGL);

    select('#inputField').input(handleInputChange);
    select('#deleteButton').mousePressed(deleteButtonPressed);

    noLoop();
    decodeData();
    calculateHoles();
}

var translated = false;
function draw() {
    if (!translated) { 
        // No idea why but this doesn't work when called from setup()
        translate(width/2, height/2);
        translated = true;
    }
    background(0);
    drawRibbon();
    drawOutlineBox();
    renderLockHoles();
    renderLines();
    drawLineToCursor();
    circleFocusedHoles();
    encodeAndWrite();
}

function mousePressed() {
    // Make it easy to break return out of once we get a hit
    (function returnableChecker(){

        // If a point was clicked,
        const hoveredHole = getInRangePoint();
        if (hoveredHole) {
            const formerActiveHole = getActiveHole();
            hoveredHole.active = true;
            if (formerActiveHole) formerActiveHole.active = false;
            return;
        }
        
        // Check for lines
        // const lineThreshold = 5;
        // for (let l of lines) {
        //     if (distToSegment(mouseX, mouseY, l.start.x, l.start.y, l.end.x, l.end.y) <= lineThreshold) {
        //         console.log("Clicked near line:", l);
        //         return;
        //     }
        // }
    })();

    // Draw everything again since something changed
    draw();
}

function mouseReleased() {
    const startHole = getActiveHole();
    const endHole = getInRangePoint();
    if (endHole && startHole) {
        const startPoint = [startHole.x, startHole.y]
        const endPoint = [endHole.x, endHole.y]
        const linePoints = [startPoint, endPoint]

        // Remove this line if it already exists
        let removed = false;
        for (var lineIndex in lines) {
            const l = lines[lineIndex];
            if (arraysEqual(l.sort(), linePoints.sort())) {
                lines.splice(lineIndex, 1);
                removed = true;
                break;
            }
        }

        if (!removed) {
            // The array was not removed, so add it
            lines.push(linePoints);
        }
    }
    if (startHole) startHole.active = false;
    draw()
}

function mouseMoved() {
    // Highlight hovered hole
    const hoveredHole = getInRangePoint();
    if (lastHoveredHole) delete lastHoveredHole.hovered;
    if (hoveredHole) {
        hoveredHole.hovered = true;
        lastHoveredHole = hoveredHole;
    }
    draw();
}
mouseDragged = mouseMoved;
