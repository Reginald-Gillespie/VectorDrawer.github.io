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

const fontResolution = 5;

// TODO: 
// Detect if highlighted area is part of an already established line, delete that and split the line into two parts if so
// Better way to delete lines

function distance(point1, point2) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function sortLines(lines) {
    if (lines.length < 1) return lines;
    // Thank you ChatGPT... it only took like 10 minutes of trying and retrying to get it to give me this which *might* work.

    const sortedLines = [];
    
    // Start with the first line and consider reversing it
    let currentLine = lines[0];
    let remainingLines = lines.slice(1);

    // Select the best orientation for the first line
    let closestLineIndex = -1;
    let closestDistance = Infinity;
    let reverse = false;

    for (let i = 0; i < remainingLines.length; i++) {
        const line = remainingLines[i];
        const distEndToStart = distance(currentLine[1], line[0]);
        const distEndToEnd = distance(currentLine[1], line[1]);
        const distStartToStart = distance(currentLine[0], line[0]);
        const distStartToEnd = distance(currentLine[0], line[1]);

        if (distEndToStart < closestDistance) {
            closestDistance = distEndToStart;
            closestLineIndex = i;
            reverse = false;
        }
        if (distEndToEnd < closestDistance) {
            closestDistance = distEndToEnd;
            closestLineIndex = i;
            reverse = true;
        }
        if (distStartToStart < closestDistance) {
            closestDistance = distStartToStart;
            closestLineIndex = i;
            reverse = false;
            currentLine = [currentLine[1], currentLine[0]]; // Reverse the initial line
        }
        if (distStartToEnd < closestDistance) {
            closestDistance = distStartToEnd;
            closestLineIndex = i;
            reverse = true;
            currentLine = [currentLine[1], currentLine[0]]; // Reverse the initial line
        }
    }

    sortedLines.push(currentLine);
    let currentPoint = currentLine[1];

    // Sort the remaining lines using the greedy algorithm
    while (remainingLines.length > 0) {
        let closestLineIndex = -1;
        let closestDistance = Infinity;
        let reverse = false;

        for (let i = 0; i < remainingLines.length; i++) {
            const line = remainingLines[i];
            const distStartToStart = distance(currentPoint, line[0]);
            const distStartToEnd = distance(currentPoint, line[1]);

            if (distStartToStart < closestDistance) {
                closestDistance = distStartToStart;
                closestLineIndex = i;
                reverse = false;
            }
            if (distStartToEnd < closestDistance) {
                closestDistance = distStartToEnd;
                closestLineIndex = i;
                reverse = true;
            }
        }

        const closestLine = remainingLines.splice(closestLineIndex, 1)[0];
        if (reverse) {
            sortedLines.push([closestLine[1], closestLine[0]]);
            currentPoint = closestLine[0];
        } else {
            sortedLines.push(closestLine);
            currentPoint = closestLine[1];
        }
    }

    return sortedLines;
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
            // const startPoint = [currentPoint.x * xScaleFactor - boxWidth / 2, -currentPoint.y * scaleFactor + boxHeight / 2];
            const startPoint = [currentPoint.x * xScaleFactor - boxWidth / 2, -currentPoint.y * scaleFactor + boxHeight / 2];
            currentPoint.x = x;
            currentPoint.y = y;
            const endPoint = [currentPoint.x * xScaleFactor - boxWidth / 2, -currentPoint.y * scaleFactor + boxHeight / 2];

            // ig it's flipped wrong now or smth
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

function encodeAndWrite(ignoreChanged=false) {
    var exportedData = []
    var lastEnd = [-1,-1];

    // Make sure either data or lines changed
    if (!ignoreChanged && !hasDataOrLinesChanged()) return;

    // Sort the lines so that the drawing can draw fastest and with the least amount of lifts
    const efficientLines = sortLines(lines);

    for (var l of efficientLines) {
        // const [startPoint, endPoint] = l;
        // const [endPoint, startPoint] = l; // Reversing this makes it export the same way as the hack pack one imports
        const [startPoint, endPoint] = l; // Reversing this makes it export the same way as the hack pack one imports

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
    const lockNum = fontResolution;
    const startX = -boxWidth / 2;
    const xPointDist = boxWidth / (lockNum-1);
    const startY = -boxHeight / 2;
    const yPointDist = boxHeight / (lockNum-1);
    for (var x = 0; x < lockNum; x++) {
        for (var y = 0; y < lockNum; y++) {
            const pointX = startX + (xPointDist*x);
            const pointY = startY + (yPointDist*y);
            // NOTE: ig we need to flip the label maker Y since their coord system flipped
            holes.push({x:pointX, y:pointY, active:false, labelMakerX:x, labelMakerY:((fontResolution-1) - y) })
        }
    }
}

function getLabelXYByGraphicalXY(x, y) {
    for (var hole of holes) {
        if (
            hole.x == x &&
            hole.y == y
        ) return [hole.labelMakerX, hole.labelMakerY] // NOTE: we're flipping y here
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
    // drawLineLabels();
    drawLineToCursor();
    circleFocusedHoles();
    encodeAndWrite();
}

function drawLineLabels() {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const midPoint = [(line[0][0] + line[1][0]) / 2, (line[0][1] + line[1][1]) / 2];
        textSize(12);
        fill(0);
        text(i + 1, midPoint[0], midPoint[1]);
    }
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
