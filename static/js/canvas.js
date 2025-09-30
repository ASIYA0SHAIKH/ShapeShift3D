// ShapeShift3D Canvas Drawing Functionality

let canvas, ctx, isDrawing = false, currentTool = 'pen', currentColor = '#000000', currentSize = 5;
let drawingHistory = [];
let historyStep = -1;

document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
});

function initializeCanvas() {
    canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    
    // Initialize drawing tools
    initializeDrawingTools();
    
    // Set up event listeners
    setupCanvasEvents();
    
    // Initialize with empty canvas
    clearCanvas();
    saveState();
    
    console.log('Canvas initialized successfully');
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const aspectRatio = 4 / 3; // 4:3 aspect ratio
    
    canvas.width = Math.min(containerWidth - 40, 800);
    canvas.height = canvas.width / aspectRatio;
    
    // Set CSS size to match
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    
    // Configure context
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function initializeDrawingTools() {
    // Tool buttons
    document.querySelectorAll('.tool-button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTool = this.dataset.tool;
            
            // Update cursor
            updateCursor();
        });
    });
    
    // Color picker
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('change', function() {
            currentColor = this.value;
            ctx.strokeStyle = currentColor;
        });
    }
    
    // Brush size
    const sizeSlider = document.getElementById('brush-size');
    if (sizeSlider) {
        sizeSlider.addEventListener('input', function() {
            currentSize = this.value;
            ctx.lineWidth = currentSize;
            updateSizeDisplay();
        });
        updateSizeDisplay();
    }
    
    // Action buttons
    const clearBtn = document.getElementById('clear-canvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCanvas);
    }
    
    const undoBtn = document.getElementById('undo-canvas');
    if (undoBtn) {
        undoBtn.addEventListener('click', undo);
    }
    
    const redoBtn = document.getElementById('redo-canvas');
    if (redoBtn) {
        redoBtn.addEventListener('click', redo);
    }
    
    const saveBtn = document.getElementById('save-drawing');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveDrawing);
    }
}

function setupCanvasEvents() {
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Prevent scrolling while drawing on mobile
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
    });
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
    });
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        ctx.beginPath();
        saveState();
    }
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                    e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = currentColor;
    saveState();
}

function saveState() {
    historyStep++;
    if (historyStep < drawingHistory.length) {
        drawingHistory.length = historyStep;
    }
    drawingHistory.push(canvas.toDataURL());
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreState();
    }
}

function redo() {
    if (historyStep < drawingHistory.length - 1) {
        historyStep++;
        restoreState();
    }
}

function restoreState() {
    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = drawingHistory[historyStep];
}

function updateCursor() {
    if (currentTool === 'pen') {
        canvas.style.cursor = 'crosshair';
    } else if (currentTool === 'eraser') {
        canvas.style.cursor = 'grab';
    }
}

function updateSizeDisplay() {
    const sizeDisplay = document.getElementById('size-display');
    if (sizeDisplay) {
        sizeDisplay.textContent = currentSize + 'px';
    }
}

function saveDrawing() {
    const modelName = document.getElementById('model-name').value || 'Untitled Drawing';
    
    if (isCanvasEmpty()) {
        if (window.ShapeShift3D) {
            window.ShapeShift3D.showAlert('Please draw something before saving.', 'error');
        }
        return;
    }
    
    // Convert canvas to data URL
    const canvasData = canvas.toDataURL('image/png');
    
    // Show loading state
    const saveBtn = document.getElementById('save-drawing');
    if (saveBtn && window.ShapeShift3D) {
        window.ShapeShift3D.addLoadingState(saveBtn);
    }
    
    // Send to server
    fetch('/draw', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `canvas_data=${encodeURIComponent(canvasData)}&model_name=${encodeURIComponent(modelName)}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (window.ShapeShift3D) {
                window.ShapeShift3D.showAlert('Drawing saved and model generated successfully!', 'success');
            }
            // Redirect to models page after a short delay
            setTimeout(() => {
                window.location.href = '/models';
            }, 2000);
        } else {
            if (window.ShapeShift3D) {
                window.ShapeShift3D.showAlert('Error saving drawing: ' + data.error, 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (window.ShapeShift3D) {
            window.ShapeShift3D.showAlert('Network error occurred while saving.', 'error');
        }
    });
}

function isCanvasEmpty() {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    const blankCtx = blank.getContext('2d');
    blankCtx.fillStyle = 'white';
    blankCtx.fillRect(0, 0, blank.width, blank.height);
    
    return canvas.toDataURL() === blank.toDataURL();
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
        }
    }
});

// Resize canvas when window resizes
window.addEventListener('resize', function() {
    if (canvas) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resizeCanvas();
        ctx.putImageData(imageData, 0, 0);
    }
});

// Export canvas functions
window.CanvasDrawing = {
    clearCanvas,
    saveDrawing,
    undo,
    redo,
    isCanvasEmpty
};
