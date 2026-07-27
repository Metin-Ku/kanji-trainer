import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { matches, KanjiStroke } from './kanji';

const WIDTH = 400;
const HEIGHT = 400;
const LINE_WIDTH = 8;

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<KanjiStroke[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<KanjiStroke[]>([]);
  const [results, setResults] = useState<Array<[number, string]>>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [fuzzy, setFuzzy] = useState(false);
  const [offby1, setOffby1] = useState(false);

  const theme = useMemo(
    () => ({
      bg: darkMode ? '#333' : '#fff',
      fg: darkMode ? '#fff' : '#000',
      grid: darkMode ? '#999' : '#ccc',
      canvasBg: darkMode ? '#222' : '#fff'
    }),
    [darkMode]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = theme.canvasBg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (showGrid) {
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      [WIDTH / 3, (2 * WIDTH) / 3].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      });
      [HEIGHT / 3, (2 * HEIGHT) / 3].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      });
    }

    ctx.strokeStyle = theme.fg;
    ctx.lineCap = 'round';
    ctx.lineWidth = LINE_WIDTH;

    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    });

    if (currentStroke.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      currentStroke.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }
  }, [strokes, currentStroke, showGrid, theme]);

  const clear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setResults([]);
  };

  const undo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT
    };
    setCurrentStroke([point]);
    setIsDrawing(true);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT
    };
    setCurrentStroke(prev => [...prev, point]);
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;
    setStrokes(prev => [...prev, currentStroke]);
    setCurrentStroke([]);
    setIsDrawing(false);
  }, [currentStroke, isDrawing]);

  const search = useCallback(() => {
    const result = matches(strokes, { fuzzy, offby1 });
    setResults(result as Array<[number, string]>);
  }, [strokes, fuzzy, offby1]);

  useEffect(() => {
    if (strokes.length > 0) search();
  }, [strokes, fuzzy, offby1, search]);

  return (
    <div className="app" style={{ color: theme.fg, background: theme.bg }}>
      <div className="toolbar">
        <button onClick={clear}>Clear</button>
        <button onClick={undo} disabled={strokes.length === 0}>Undo</button>
        <button onClick={search} disabled={strokes.length === 0}>Search</button>
        <label><input type="checkbox" checked={showGrid} onChange={() => setShowGrid(v => !v)} /> Grid</label>
        <label><input type="checkbox" checked={fuzzy} onChange={() => setFuzzy(v => !v)} /> Fuzzy</label>
        <label><input type="checkbox" checked={offby1} onChange={() => setOffby1(v => !v)} /> ±1 stroke</label>
        <label><input type="checkbox" checked={darkMode} onChange={() => setDarkMode(v => !v)} /> Dark</label>
      </div>
      <div className="content">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="draw-canvas"
        />
        <div className="results">
          <h2>Matches</h2>
          {results.length === 0 ? (
            <p>No results yet.</p>
          ) : (
            <ul>
              {results.map(([score, kanji], index) => (
                <li key={index}>
                  <strong>{kanji}</strong> <span>{score.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
