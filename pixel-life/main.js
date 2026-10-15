'use strict';

resize();
newWorld(state.worldSize);
setSpeed(1);
setBrush(state.brush);
setBrushShape(state.brushShape);
renderPanel();
requestAnimationFrame(frame);
