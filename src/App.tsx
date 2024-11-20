import React, { useState, useRef, useEffect } from "react";
import {
  CiTextAlignCenter,
  CiTextAlignLeft,
  CiTextAlignRight,
} from "react-icons/ci";
import { FaBold, FaItalic, FaUnderline } from "react-icons/fa";
import { GrRedo, GrUndo } from "react-icons/gr";
import { MdDeleteForever } from "react-icons/md";
import { TfiText } from "react-icons/tfi";

interface Position {
  x: number;
  y: number;
}

interface TextBox {
  id: string;
  text: string;
  position: Position;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontBold: string | null;
  fontItalic: string | null;
  textAlignment: string | null;
  textUnderline: boolean;
}

interface HistoryState {
  textBoxes: TextBox[];
}

export default function App() {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  // const [newText, setNewText] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<TextBox | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([{ textBoxes: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const CANVAS_WIDTH = 300;
  const CANVAS_HEIGHT = 480;
  const FONT_SIZE = 16;
  const PADDING = 8;

  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    ctx.font = `${FONT_SIZE}px Arial`;
    ctx.textBaseline = "top";
    return ctx;
  };

  const measureText = (text: string): { width: number; height: number } => {
    const ctx = getContext();
    if (!ctx) return { width: 0, height: 0 };

    const metrics = ctx.measureText(text);
    return {
      width: metrics.width + PADDING * 2,
      height: FONT_SIZE + PADDING * 2,
    };
  };

  const addToHistory = (newTextBoxes: TextBox[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ textBoxes: newTextBoxes });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setTextBoxes(history[historyIndex - 1].textBoxes);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setTextBoxes(history[historyIndex + 1].textBoxes);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const getTextBoxAt = (x: number, y: number): string | null => {
    for (let i = textBoxes.length - 1; i >= 0; i--) {
      const box = textBoxes[i];
      if (
        x >= box.position.x &&
        x <= box.position.x + box.width &&
        y >= box.position.y &&
        y <= box.position.y + box.height
      ) {
        return box.id;
      }
    }
    return null;
  };

  const getEventCoordinates = (
    e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
  ): { clientX: number; clientY: number } => {
    if ("touches" in e) {
      return {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
      };
    }
    return {
      clientX: (e as MouseEvent).clientX,
      clientY: (e as MouseEvent).clientY,
    };
  };

  const handleStart = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const coords = getEventCoordinates(e);
    const x = coords.clientX - rect.left;
    const y = coords.clientY - rect.top;

    const boxId = getTextBoxAt(x, y);
    if (boxId) {
      isDragging.current = true;
      setDragId(boxId);
      const box = textBoxes.find((b) => b.id === boxId);
      if (box) {
        dragOffset.current = {
          x: x - box.position.x,
          y: y - box.position.y,
        };
      }
    }
    setSelectedId(boxId);
  };

  const handleMove = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!dragId || !isDragging.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const coords = getEventCoordinates(e);
    const x = coords.clientX - rect.left;
    const y = coords.clientY - rect.top;

    setTextBoxes((prev) =>
      prev.map((box) => {
        if (box.id === dragId) {
          const newX = Math.max(
            0,
            Math.min(x - dragOffset.current.x, CANVAS_WIDTH - box.width)
          );
          const newY = Math.max(
            0,
            Math.min(y - dragOffset.current.y, CANVAS_HEIGHT - box.height)
          );
          return { ...box, position: { x: newX, y: newY } };
        }
        return box;
      })
    );
  };

  const handleEnd = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (dragId && isDragging.current) {
      addToHistory(textBoxes);
      setDragId(null);
      isDragging.current = false;
    }
  };

  //
  const [clickCount, setClickCount] = useState(0);
  const [lastTouchTime, setLastTouchTime] = useState<number | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const boxId = getTextBoxAt(x, y);
    if (boxId) {
      // SingleClick
      setSelectedId(boxId);
      setClickCount(clickCount + 1);
      if (boxId == selectedId) {
        setClickCount(2);
        const currentTime = Date.now();
        if (lastTouchTime && currentTime - lastTouchTime < 300) {
          // Double-tap detected
          setEditId(boxId);
        }
        setLastTouchTime(currentTime);
      }
    }
  };

  const handleAddText = () => {
    const updatedTextBoxes = [
      ...textBoxes,
      {
        id: JSON.stringify(Date.now()),
        text: "",
        position: { x: 50, y: 50 },
        width: 1,
        height: 1,
        fontSize: 12,
        fontFamily: "sans",
        fontBold: null,
        fontItalic: null,
        textAlignment: null,
        textUnderline: false,
      },
    ];
    setTextBoxes(updatedTextBoxes);
    setEditId(updatedTextBoxes[updatedTextBoxes.length - 1].id);
  };
  const handleTextEdit = (id: string, Text: string) => {
    console.log(Text.trim() === "");

    if (Text.trim() === "") {
      handleDelete(id);
      setEditId(null);
      return;
    }
    const dimensions = measureText(Text);
    const updatedTextBoxes = textBoxes.map((box) =>
      box.id === id ? { ...box, text: Text.trim(), ...dimensions } : box
    );
    setTextBoxes(updatedTextBoxes);
    addToHistory(updatedTextBoxes);
    setEditId(null);
  };

  const handleDelete = (id: string | null = null) => {
    const idToDelete = id || selectedId;
    if (idToDelete) {
      const updatedTextBoxes = textBoxes.filter((box) => box.id !== idToDelete);
      setTextBoxes(updatedTextBoxes);
      addToHistory(updatedTextBoxes);
      setSelectedId(null);
    }
  };

  const drawCanvas = () => {
    const ctx = getContext();
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    textBoxes.forEach((box) => {
      const isSelected = selectedId === box.id;

      // Set font properties
      const fontStyle = [
        box.fontBold ? "bold" : "",
        box.fontItalic ? "italic" : "",
        `${box.fontSize}px`,
        `${box.fontFamily}, sans-serif`,
      ]
        .filter(Boolean)
        .join(" ");

      ctx.font = fontStyle;

      // Draw background
      ctx.fillStyle = "#ffffff";

      const metrics = ctx.measureText(box.text);
      const textWidth = metrics.width;
      const textHeight = box.fontSize; // Height is proportional to the font size

      // Add padding around the text
      const backgroundPadding = 10;

      const backgroundWidth = textWidth + 2 * backgroundPadding;
      const backgroundHeight = textHeight + 2 * backgroundPadding;

      const backgroundX = box.position.x;
      const backgroundY = box.position.y;

      // Update box width and height to match the calculated background
      box.width = backgroundWidth;
      box.height = backgroundHeight;

      ctx.fillRect(backgroundX, backgroundY, backgroundWidth, backgroundHeight);

      // Draw selection outline
      if (isSelected) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "#000000";
        ctx.strokeRect(box.position.x, box.position.y, box.width, box.height);
        ctx.restore();
      }

      // Set text properties
      ctx.textAlign = (box.textAlignment as CanvasTextAlign) ?? "start";
      ctx.textBaseline = "alphabetic"; // Changed to alphabetic for better text positioning
      ctx.fillStyle = "#000000";

      // Calculate text X position based on alignment
      let textX = box.position.x + PADDING;
      if (box.textAlignment === "center") {
        textX = box.position.x + box.width / 2;
      } else if (box.textAlignment === "right") {
        textX = box.position.x + box.width - PADDING;
      }

      const textY = box.position.y + PADDING + box.fontSize; // Adjusted for proper text positioning

      // Draw text
      ctx.fillText(box.text, textX, textY);

      // Draw underline if enabled
      if (box.textUnderline) {
        ctx.save();
        const metrics = ctx.measureText(box.text);
        const textWidth = metrics.width;

        // Calculate underline position - now below the text
        const underlineY = textY + 2; // Moved below the text

        // Calculate underline start and end positions based on text alignment
        let startX = textX;
        let endX = textX + textWidth;

        if (box.textAlignment === "center") {
          startX = textX - textWidth / 2;
          endX = textX + textWidth / 2;
        } else if (box.textAlignment === "right") {
          startX = textX - textWidth;
          endX = textX;
        }

        // Draw underline
        ctx.beginPath();
        ctx.lineWidth = Math.max(1, box.fontSize * 0.08); // Scale underline with font size
        ctx.setLineDash([]); // Solid line for underline
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(endX, underlineY);
        ctx.stroke();
        ctx.restore();
      }
    });
  };
  useEffect(() => {
    if (dragId) {
      window.addEventListener("mousemove", handleMove, { passive: false });
      window.addEventListener("mouseup", handleEnd, { passive: false });
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleEnd, { passive: false });
      window.addEventListener("touchcancel", handleEnd, { passive: false });

      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleEnd);
        window.removeEventListener("touchcancel", handleEnd);
      };
    }
  }, [dragId]);

  useEffect(() => {
    drawCanvas();
    if (selectedId) {
      const SBox = textBoxes[textBoxes.findIndex((b) => b.id == selectedId)];
      setSelectedBox(SBox);
    }
  }, [textBoxes, selectedId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedId) {
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const handleFontFamily = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    const updatedTextBoxes = textBoxes.map((box) => {
      if (box.id == selectedId) {
        box.fontFamily = e.target.value;
      }
      return box;
    });
    setTextBoxes(updatedTextBoxes);
    addToHistory(updatedTextBoxes);
  };
  const handleFontSizeChange = (delta: number) => {
    if (!selectedBox) return;

    setTextBoxes(
      textBoxes.map((box) =>
        box.id === selectedId
          ? { ...box, fontSize: (box.fontSize || 0) + delta }
          : box
      )
    );

    drawCanvas(); // Trigger canvas redraw
    addToHistory(textBoxes);
  };

  const handleToggleFontBold = () => {
    if (!selectedBox) return;

    const newFontBold = selectedBox.fontBold === "bold" ? null : "bold"; // Determine new value

    setTextBoxes(
      textBoxes.map((box) =>
        box.id === selectedId ? { ...box, fontBold: newFontBold } : box
      )
    );

    drawCanvas(); // Trigger canvas redraw
    addToHistory(textBoxes);
  };
  const handleToggleFontItalic = () => {
    if (!selectedBox) return;

    const newFontItalic = selectedBox.fontItalic === "italic" ? null : "italic"; // Determine new value

    setTextBoxes(
      textBoxes.map((box) =>
        box.id === selectedId ? { ...box, fontItalic: newFontItalic } : box
      )
    );

    drawCanvas(); // Trigger canvas redraw
    addToHistory(textBoxes);
  };
  const handleToggleTextAlignment = () => {
    if (!selectedBox) return;

    // Determine the next alignment in the cycle
    const alignmentCycle = [null, "left", "center", "right"];
    const currentIndex = alignmentCycle.indexOf(selectedBox.textAlignment);
    const nextAlignment =
      alignmentCycle[(currentIndex + 1) % alignmentCycle.length];

    setTextBoxes(
      textBoxes.map((box) =>
        box.id === selectedId ? { ...box, textAlignment: nextAlignment } : box
      )
    );

    drawCanvas(); // Trigger canvas redraw
    addToHistory(textBoxes);
  };
  const handleToggleTextUnderline = () => {
    if (!selectedBox) return;

    // Toggle underline state
    const newUnderlineState = !selectedBox.textUnderline;

    setTextBoxes(
      textBoxes.map((box) =>
        box.id === selectedId
          ? { ...box, textUnderline: newUnderlineState }
          : box
      )
    );

    drawCanvas(); // Trigger canvas redraw
    addToHistory(textBoxes);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 mb-2">
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 flex flex-col justify-center items-center"
        >
          <GrUndo />
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 flex flex-col justify-center items-center"
        >
          <GrRedo />
          Redo
        </button>
        <button
          onClick={() => handleDelete()}
          disabled={!selectedId}
          className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50 flex flex-col justify-center items-center"
        >
          <MdDeleteForever />
          Delete
        </button>
      </div>

      <div ref={containerRef} className="relative touch-none">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          className="border border-spacing-1 border-black bg-white"
          onMouseDown={(e) => {
            handleStart(e);
          }}
          onTouchStart={(e) => {
            handleStart(e);

            // handleClick(e)
          }}
          onClick={handleClick}
          // onDoubleClick={handleDoubleClick}
        />
        {editId && (
          <textarea
            autoFocus
            className="absolute outline-none border border-black border-dashed rounded w-24 h-24"
            style={{
              left: textBoxes.find((b) => b.id === editId)?.position.x,
              top: textBoxes.find((b) => b.id === editId)?.position.y,
            }}
            defaultValue={textBoxes.find((b) => b.id === editId)?.text}
            onBlur={(e) => handleTextEdit(editId, e.target.value)}
          />
        )}
      </div>
      {/* buttons */}

      <div className="flex gap-6">
        <select
          id="fontSelect"
          onClick={(e) => e.preventDefault()}
          onChange={(e) => handleFontFamily(e)}
          disabled={!selectedId}
          className="border border-black"
        >
          <option value="Arial">Arial</option>
          <option value="Verdana">Verdana</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Impact">Impact</option>
          <option value="Lucida Console">Lucida Console</option>
          <option value="Palatino">Palatino</option>
          <option value="Arial Black">Arial Black</option>
          <option value="Helvetica">Helvetica</option>
          <option value="cursive">Cursive</option>
        </select>
        {/* fontSize */}
        <div className="flex gap-3 justify-between items-center max-w-20 border border-black rounded-xl px-3">
          {selectedId ? (
            <>
              <span
                className="text-xl font-bold cursor-pointer"
                onClick={() => handleFontSizeChange(-1)}
              >
                -
              </span>
              <span>{selectedBox?.fontSize}</span>
              <span
                className="text-xl font-bold cursor-pointer"
                onClick={() => handleFontSizeChange(1)}
              >
                +
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold">-</span>
              <span className="text-opacity-0">14</span>
              <span className="text-xl font-bold">+</span>
            </>
          )}
        </div>

        <button
          className={`p-1 border rounded-md ${
            selectedBox?.fontBold === "bold" ? "bg-gray-400" : ""
          }`}
          disabled={!selectedId}
          onClick={() => handleToggleFontBold()}
        >
          <FaBold />
        </button>

        <button
          className={`p-1 border rounded-md ${
            selectedBox?.fontItalic === "italic" ? "bg-gray-400" : ""
          }`}
          disabled={!selectedId}
          onClick={() => handleToggleFontItalic()}
        >
          <FaItalic />
        </button>

        <button
          className={`p-1 border rounded-md ${
            selectedBox?.textAlignment != null ? "bg-gray-400" : ""
          }`}
          disabled={!selectedId}
          onClick={() => handleToggleTextAlignment()}
        >
          {selectedBox?.textAlignment == null ||
          selectedBox.textAlignment === "left" ? (
            <CiTextAlignLeft />
          ) : selectedBox.textAlignment === "center" ? (
            <CiTextAlignCenter />
          ) : (
            <CiTextAlignRight />
          )}
        </button>

        <button
          className={`p-1 border rounded-md ${
            selectedBox?.textUnderline ? "bg-gray-400" : ""
          }`}
          disabled={!selectedId}
          onClick={() => handleToggleTextUnderline()}
        >
          <FaUnderline />
        </button>
      </div>
      <button
        onClick={() => {
          handleAddText();
        }}
        className="px-3 py-2 mb-1 bg-gray-300 text-black text-sm rounded-2xl hover:bg-gray-400 flex gap-2 justify-between items-center"
      >
        <TfiText />
        Add Text
      </button>
    </div>
  );
}
