import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { removeBackground } from '@imgly/background-removal';
import Upscaler from 'upscaler';

const NovaCanvas: React.FC = () => {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Drawing Mode States
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#6C63FF');
  const [brushSize, setBrushSize] = useState(5);

  // --- NEW: Element Property States ---
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [fontSize, setFontSize] = useState(36);
  const [shapeType, setShapeType] = useState('rectangle');
  const [shapeColor, setShapeColor] = useState('#6C63FF');

  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryProcessing = useRef<boolean>(false); 
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveHistory = () => {
    if (isHistoryProcessing.current || !fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const json = canvas.toJSON();
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  useEffect(() => {
    if (canvasElementRef.current) {
      const sidebarWidth = 320; 
      const availableWidth = window.innerWidth - sidebarWidth; 
      const availableHeight = window.innerHeight; 

      const canvas = new fabric.Canvas(canvasElementRef.current, {
        width: availableWidth,
        height: availableHeight,
        backgroundColor: '#181824',
        selection: true,
      });

      fabricCanvasRef.current = canvas;
      saveHistory();

      canvas.on('object:added', saveHistory);
      canvas.on('object:modified', saveHistory);
      canvas.on('object:removed', saveHistory);
      canvas.on('path:created', saveHistory); 

      // --- NEW: Update UI states when clicking different objects ---
      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.off('object:added', saveHistory);
        fabricCanvasRef.current.off('object:modified', saveHistory);
        fabricCanvasRef.current.off('object:removed', saveHistory);
        fabricCanvasRef.current.off('path:created', saveHistory);
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  // Sync the sidebar controls with the currently clicked object
  const handleSelection = (e: any) => {
    const activeObject = e.selected?.[0];
    if (!activeObject) return;

    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      setTextColor(activeObject.fill);
      setFontFamily(activeObject.fontFamily);
      setFontSize(activeObject.fontSize);
    } else if (['rect', 'circle', 'triangle'].includes(activeObject.type)) {
      setShapeColor(activeObject.fill);
      setShapeType(activeObject.type === 'rect' ? 'rectangle' : activeObject.type);
    }
  };

  // --- NEW: Live Update Active Object ---
  // When a user changes a dropdown/color picker, instantly update the selected object
  const updateActiveObject = (property: string, value: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.set(property, value);
      canvas.renderAll();
      saveHistory();
    }
  };

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.isDrawingMode = isDrawing;
      if (isDrawing) {
        const brush = new (fabric as any).PencilBrush(canvas);
        brush.color = brushColor;
        brush.width = brushSize;
        canvas.freeDrawingBrush = brush;
      }
    }
  }, [isDrawing, brushColor, brushSize]);

  const handleUndo = () => {
    if (historyIndexRef.current > 0 && fabricCanvasRef.current) {
      isHistoryProcessing.current = true; 
      historyIndexRef.current -= 1;
      const previousState = historyRef.current[historyIndexRef.current];
      fabricCanvasRef.current.loadFromJSON(previousState).then(() => {
        fabricCanvasRef.current?.renderAll();
        isHistoryProcessing.current = false;
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      });
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1 && fabricCanvasRef.current) {
      isHistoryProcessing.current = true;
      historyIndexRef.current += 1;
      const nextState = historyRef.current[historyIndexRef.current];
      fabricCanvasRef.current.loadFromJSON(nextState).then(() => {
        fabricCanvasRef.current?.renderAll();
        isHistoryProcessing.current = false;
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgDataUrl = event.target?.result as string;
      fabric.Image.fromURL(imgDataUrl).then((img) => {
        if (img.width && img.width > 800) img.scaleToWidth(600);
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          canvas.add(img);
          canvas.centerObject(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        }
      }).catch(err => console.error(err));
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const handleClearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#181824';
      canvas.renderAll();
    }
  };

  const handleExport = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `NovaBlend_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- UPDATED: Text with advanced formatting ---
  const handleAddText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const text = new fabric.IText('Double-tap to edit', {
      left: 200, top: 200, 
      fill: textColor, 
      fontFamily: fontFamily, 
      fontSize: fontSize, 
      fontWeight: 'bold',
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 5, offsetX: 2, offsetY: 2 })
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // --- UPDATED: Dynamic Shapes ---
  const handleAddShape = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    let shape;
    if (shapeType === 'rectangle') {
      shape = new fabric.Rect({ left: 250, top: 250, fill: shapeColor, width: 150, height: 150, rx: 15, ry: 15 });
    } else if (shapeType === 'circle') {
      shape = new fabric.Circle({ left: 250, top: 250, fill: shapeColor, radius: 75 });
    } else if (shapeType === 'triangle') {
      shape = new fabric.Triangle({ left: 250, top: 250, fill: shapeColor, width: 150, height: 150 });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  };

  const handleLayerAction = (action: 'forward' | 'backward') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return alert("Select an object to move its layer!");

    if (action === 'forward') {
      canvas.bringObjectForward(activeObject);
    } else {
      canvas.sendObjectBackwards(activeObject);
    }
    
    canvas.discardActiveObject();
    canvas.setActiveObject(activeObject);
    canvas.renderAll();
    saveHistory();
  };

  const applyFilter = (filterType: 'grayscale' | 'sepia') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject() as any; 
    
    if (!activeObject || activeObject.type !== 'image') {
      return alert("Please select an image to apply a filter!");
    }

    if (!activeObject.filters) activeObject.filters = [];
    let filter;
    if (filterType === 'grayscale') filter = new (fabric as any).filters.Grayscale();
    if (filterType === 'sepia') filter = new (fabric as any).filters.Sepia();

    if (filter) {
      activeObject.filters.push(filter);
      activeObject.applyFilters();
      canvas.renderAll();
      saveHistory();
    }
  };

  const handleRemoveBackground = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') return alert("Select an image first!");

    setIsProcessing(true);
    try {
      const dataUrl = activeObject.toDataURL({ format: 'png' });
      const imageBlob = await removeBackground(dataUrl);
      const transparentUrl = URL.createObjectURL(imageBlob);

      fabric.Image.fromURL(transparentUrl).then((newImg) => {
        newImg.set({ left: activeObject.left, top: activeObject.top, scaleX: activeObject.scaleX, scaleY: activeObject.scaleY, angle: activeObject.angle });
        isHistoryProcessing.current = true;
        canvas.remove(activeObject);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
        isHistoryProcessing.current = false;
        saveHistory();
      });
    } catch (error) {
      console.error(error);
      alert("AI Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnhance = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') return alert("Select an image first!");

    setIsEnhancing(true);
    try {
      const dataUrl = activeObject.toDataURL({ format: 'png' });
      const upscaler = new Upscaler();
      const enhancedDataUrl = await upscaler.upscale(dataUrl, { patchSize: 64, padding: 2 });

      fabric.Image.fromURL(enhancedDataUrl).then((newImg) => {
        const currentScaleX = activeObject.scaleX || 1;
        const currentScaleY = activeObject.scaleY || 1;
        newImg.set({ left: activeObject.left, top: activeObject.top, scaleX: currentScaleX / 2, scaleY: currentScaleY / 2, angle: activeObject.angle });
        isHistoryProcessing.current = true;
        canvas.remove(activeObject);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
        isHistoryProcessing.current = false;
        saveHistory();
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        
        <div style={styles.brandHeader}>
          <h1 style={styles.brandTitle}>NOVA<span style={{ color: '#6C63FF' }}>BLEND</span></h1>
        </div>

        <div style={styles.historyRow}>
          <button onClick={handleUndo} disabled={!canUndo || isProcessing} style={(!canUndo || isProcessing) ? styles.historyButtonDisabled : styles.historyButton}>
            <span>↩️</span> Undo
          </button>
          <button onClick={handleRedo} disabled={!canRedo || isProcessing} style={(!canRedo || isProcessing) ? styles.historyButtonDisabled : styles.historyButton}>
            <span>↪️</span> Redo
          </button>
        </div>

        <div style={styles.toolSection}>
          <h3 style={styles.sectionTitle}>File</h3>
          <label style={styles.actionButton}>
            <span style={styles.icon}>📂</span> Open Image
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* --- NEW: Advanced Text Panel --- */}
        <div style={styles.toolSection}>
          <h3 style={styles.sectionTitle}>Typography</h3>
          <div style={styles.propertiesPanel}>
            <div style={styles.controlGroup}>
              <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); updateActiveObject('fontFamily', e.target.value); }} style={styles.select}>
                <option value="sans-serif">Sans-Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="Impact">Impact</option>
                <option value="Comic Sans MS">Comic Sans</option>
              </select>
              <input type="number" value={fontSize} onChange={(e) => { setFontSize(Number(e.target.value)); updateActiveObject('fontSize', Number(e.target.value)); }} style={styles.numberInput} />
              <input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); updateActiveObject('fill', e.target.value); }} style={styles.colorPicker} />
            </div>
            <button onClick={handleAddText} style={{...styles.actionButton, width: '100%', justifyContent: 'center'}}>📝 Add Text</button>
          </div>
        </div>

        {/* --- NEW: Advanced Shapes Panel --- */}
        <div style={styles.toolSection}>
          <h3 style={styles.sectionTitle}>Shapes</h3>
          <div style={styles.propertiesPanel}>
            <div style={styles.controlGroup}>
              <select value={shapeType} onChange={(e) => setShapeType(e.target.value)} style={styles.selectLarge}>
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
              </select>
              <input type="color" value={shapeColor} onChange={(e) => { setShapeColor(e.target.value); updateActiveObject('fill', e.target.value); }} style={styles.colorPicker} />
            </div>
            <button onClick={handleAddShape} style={{...styles.actionButton, width: '100%', justifyContent: 'center'}}>🟩 Add Shape</button>
          </div>
        </div>

        <div style={styles.toolSection}>
          <h3 style={styles.sectionTitle}>Layers & Drawing</h3>
          <div style={styles.historyRow}>
            <button onClick={() => handleLayerAction('forward')} style={styles.halfButton}>⬆️ Bring Fwd</button>
            <button onClick={() => handleLayerAction('backward')} style={styles.halfButton}>⬇️ Send Back</button>
          </div>
          
          <button onClick={() => { setIsDrawing(!isDrawing); if (fabricCanvasRef.current) fabricCanvasRef.current.discardActiveObject(); }} style={isDrawing ? styles.activeButton : styles.actionButton}>
            <span style={styles.icon}>🖌️</span> {isDrawing ? 'Drawing Mode: ON' : 'Draw Freehand'}
          </button>
          
          {isDrawing && (
            <div style={styles.propertiesPanel}>
              <div style={styles.controlGroup}>
                <label style={styles.label}>Size ({brushSize}):</label>
                <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={styles.slider} />
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} style={styles.colorPicker} />
              </div>
            </div>
          )}
        </div>

        <div style={styles.toolSection}>
          <h3 style={styles.sectionTitle}>AI & Filters</h3>
          <div style={styles.historyRow}>
            <button onClick={() => applyFilter('grayscale')} style={styles.halfButton}>⚫ Gray</button>
            <button onClick={() => applyFilter('sepia')} style={styles.halfButton}>🟤 Sepia</button>
          </div>
          <button onClick={handleRemoveBackground} style={isProcessing ? styles.disabledButton : styles.aiButton} disabled={isProcessing}>
            <span style={styles.icon}>✨</span> {isProcessing ? 'Processing...' : 'Drop Background'}
          </button>
          <button onClick={handleEnhance} style={isEnhancing ? styles.disabledButton : styles.aiButtonOrange} disabled={isEnhancing || isProcessing}>
            <span style={styles.icon}>🔮</span> {isEnhancing ? 'Enhancing...' : 'Upscale Quality'}
          </button>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={handleExport} style={{...styles.actionButton, backgroundColor: '#00D084', color: '#000', width: '100%', justifyContent: 'center'}}>
            <span style={styles.icon}>💾</span> Save Final Collage
          </button>
          <button onClick={handleClearCanvas} style={styles.dangerButton}>🗑️ Clear Workspace</button>
        </div>

      </div>

      <div style={styles.canvasContainer}>
        <canvas ref={canvasElementRef} />
      </div>

    </div>
  );
};

// --- STYLING ---
const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', backgroundColor: '#181824', overflow: 'hidden', fontFamily: 'sans-serif' },
  sidebar: { width: '340px', minWidth: '340px', boxSizing: 'border-box', overflowY: 'auto', backgroundColor: '#14141F', borderRight: '1px solid #2A2A3A', padding: '25px 20px', display: 'flex', flexDirection: 'column', gap: '18px', zIndex: 10 },
  brandHeader: { borderBottom: '1px solid #2A2A3A', paddingBottom: '10px' },
  brandTitle: { color: '#fff', fontSize: '1.8rem', margin: 0, letterSpacing: '2px' },
  historyRow: { display: 'flex', gap: '8px', width: '100%' },
  historyButton: { flex: 1, padding: '10px', backgroundColor: '#232336', border: '1px solid #3A3A5A', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  historyButtonDisabled: { flex: 1, padding: '10px', backgroundColor: '#1A1A24', border: '1px solid #2A2A3A', color: '#555', borderRadius: '8px', cursor: 'not-allowed', fontWeight: '600', fontSize: '0.85rem' },
  toolSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sectionTitle: { color: '#8A8A9E', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0px' },
  icon: { fontSize: '1.1rem' },
  actionButton: { padding: '12px 15px', backgroundColor: '#232336', border: '1px solid #3A3A5A', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' },
  activeButton: { padding: '12px 15px', backgroundColor: '#6C63FF', border: '1px solid #8A84FF', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' },
  halfButton: { flex: 1, padding: '10px', backgroundColor: '#232336', border: '1px solid #3A3A5A', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  aiButton: { padding: '12px 15px', backgroundColor: '#6C63FF', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' },
  aiButtonOrange: { padding: '12px 15px', backgroundColor: '#FF9F1C', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' },
  disabledButton: { padding: '12px 15px', backgroundColor: '#2A2A3A', border: 'none', color: '#666', borderRadius: '8px', cursor: 'not-allowed', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' },
  dangerButton: { padding: '12px 15px', backgroundColor: 'transparent', border: '1px solid #FF4A4A', color: '#FF4A4A', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', width: '100%' },
  canvasContainer: { flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', backgroundColor: '#181824', overflow: 'hidden' },
  propertiesPanel: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', backgroundColor: '#1A1A24', borderRadius: '8px', border: '1px solid #2A2A3A' },
  controlGroup: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' },
  label: { color: '#ccc', fontSize: '0.85rem' },
  colorPicker: { cursor: 'pointer', width: '32px', height: '32px', border: 'none', borderRadius: '4px', padding: 0, backgroundColor: 'transparent', flexShrink: 0 },
  select: { flex: 1, padding: '8px', backgroundColor: '#232336', color: '#fff', border: '1px solid #3A3A5A', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' },
  selectLarge: { flex: 2, padding: '8px', backgroundColor: '#232336', color: '#fff', border: '1px solid #3A3A5A', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' },
  numberInput: { width: '50px', padding: '8px', backgroundColor: '#232336', color: '#fff', border: '1px solid #3A3A5A', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', textAlign: 'center' },
  slider: { flex: 1, cursor: 'pointer' }
};

export default NovaCanvas;