// ShapeShift3D 3D Model Viewer using Three.js

let scene, camera, renderer, model, controls;
let isViewerInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    const viewerContainer = document.getElementById('model-viewer');
    if (viewerContainer) {
        initializeViewer();
    }
});

function initializeViewer() {
    const container = document.getElementById('model-viewer');
    if (!container) return;
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    }
    
    // Lighting
    setupLighting();
    
    // Load default model (cube for demo)
    loadDefaultModel();
    
    // Start render loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    isViewerInitialized = true;
    console.log('3D Viewer initialized successfully');
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Point light for better illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-1, 1, 1);
    scene.add(pointLight);
}

function loadDefaultModel() {
    // Create a default 3D model (textured cube) as demonstration
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    
    // Create a simple texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Draw a gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add some text
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ShapeShift3D', 128, 128);
    ctx.fillText('Demo Model', 128, 156);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshLambertMaterial({ map: texture });
    
    model = new THREE.Mesh(geometry, material);
    model.castShadow = true;
    model.receiveShadow = true;
    scene.add(model);
}

function loadModelFromFile(filePath) {
    // In a real implementation, this would load actual 3D model files
    // For demo purposes, we'll create different geometric shapes
    
    if (model) {
        scene.remove(model);
    }
    
    // Create different models based on file type/name
    let geometry;
    const modelType = Math.floor(Math.random() * 4);
    
    switch (modelType) {
        case 0:
            geometry = new THREE.SphereGeometry(1.5, 32, 32);
            break;
        case 1:
            geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
            break;
        case 2:
            geometry = new THREE.ConeGeometry(1, 2, 32);
            break;
        default:
            geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
    }
    
    // Create material with random color
    const color = new THREE.Color();
    color.setHSL(Math.random(), 0.7, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: color });
    
    model = new THREE.Mesh(geometry, material);
    model.castShadow = true;
    model.receiveShadow = true;
    scene.add(model);
    
    // Add some animation
    animateModel();
}

function animateModel() {
    if (model) {
        // Gentle rotation animation
        const animate = () => {
            if (model) {
                model.rotation.y += 0.005;
                model.rotation.x += 0.002;
            }
        };
        
        // Add to render loop
        const originalAnimate = window.modelAnimate || (() => {});
        window.modelAnimate = () => {
            originalAnimate();
            animate();
        };
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }
    
    // Custom model animation
    if (window.modelAnimate) {
        window.modelAnimate();
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('model-viewer');
    if (!container || !camera || !renderer) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function resetCamera() {
    if (camera && controls) {
        camera.position.set(0, 0, 5);
        controls.reset();
    }
}

function exportModel() {
    if (!model) {
        alert('No model to export');
        return;
    }
    
    // In a real implementation, this would export the actual 3D model
    // For demo, we'll create a simple data structure
    const exportData = {
        type: 'ShapeShift3D Model',
        timestamp: new Date().toISOString(),
        vertices: model.geometry.attributes.position.count,
        faces: model.geometry.index ? model.geometry.index.count / 3 : model.geometry.attributes.position.count / 3
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'shapeshift3d_model.json';
    link.click();
}

// Model viewer controls
function setupViewerControls() {
    const resetBtn = document.getElementById('reset-camera');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetCamera);
    }
    
    const exportBtn = document.getElementById('export-model');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportModel);
    }
    
    const wireframeToggle = document.getElementById('wireframe-toggle');
    if (wireframeToggle) {
        wireframeToggle.addEventListener('change', function() {
            if (model && model.material) {
                model.material.wireframe = this.checked;
            }
        });
    }
}

// Initialize viewer controls when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupViewerControls, 1000); // Delay to ensure viewer is initialized
});

// Model gallery interactions
function viewModel(modelId) {
    // In a real implementation, this would load the specific model
    console.log('Loading model:', modelId);
    
    if (isViewerInitialized) {
        loadModelFromFile(modelId);
    }
    
    // Open modal or navigate to viewer page
    const modal = document.getElementById('model-viewer-modal');
    if (modal) {
        // Bootstrap modal
        if (typeof bootstrap !== 'undefined') {
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        }
    }
}

function downloadModel(modelId) {
    // Simulate model download
    console.log('Downloading model:', modelId);
    
    // Create a simple demo file
    const demoContent = `# ShapeShift3D Model Export
# Model ID: ${modelId}
# Generated: ${new Date().toISOString()}
# This is a demo file - in production, this would be actual 3D model data

v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 1.0 1.0 0.0
v 0.0 1.0 0.0

f 1 2 3 4
`;
    
    const blob = new Blob([demoContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `model_${modelId}.obj`;
    link.click();
}

function deleteModel(modelId) {
    if (confirm('Are you sure you want to delete this model?')) {
        // In a real implementation, this would make an API call to delete the model
        console.log('Deleting model:', modelId);
        
        // Remove from UI
        const modelCard = document.querySelector(`[data-model-id="${modelId}"]`);
        if (modelCard) {
            modelCard.remove();
        }
        
        if (window.ShapeShift3D) {
            window.ShapeShift3D.showAlert('Model deleted successfully', 'success');
        }
    }
}

// Export viewer functions
window.ModelViewer = {
    loadModelFromFile,
    resetCamera,
    exportModel,
    viewModel,
    downloadModel,
    deleteModel
};
