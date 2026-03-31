import { renderHook, act } from '@testing-library/react';
import { useSketchCanvasRig } from '../use-sketch-canvas-rig';
import type { BodyPartName, Side } from '../use-sketch-canvas-rig';

const CANVAS_SIZE = 400;

/** Create a mock canvas element with a mock 2d context. */
function makeMockCanvas(opts?: { blankPixels?: boolean }) {
  const blankPixels = opts?.blankPixels ?? true;
  const pixelData = new Uint8ClampedArray(CANVAS_SIZE * CANVAS_SIZE * 4);
  if (!blankPixels) {
    // Put some non-zero data so it's not blank
    pixelData[0] = 255;
    pixelData[3] = 255;
  }

  const mockImageData: ImageData = {
    data: pixelData,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    colorSpace: 'srgb',
  };

  const ctx = {
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(pixelData),
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      colorSpace: 'srgb',
    })),
    putImageData: vi.fn(),
    clearRect: vi.fn(),
  };

  const canvas = {
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => 'data:image/webp;base64,mockdata'),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

describe('useSketchCanvasRig', () => {
  const side: Side = 'front';
  const part: BodyPartName = 'head';

  it('copyCanvas copies pixel data from source to destination canvas', () => {
    const { result } = renderHook(() => useSketchCanvasRig());
    const src = makeMockCanvas();
    const dst = makeMockCanvas();

    act(() => {
      result.current.setCanvasRef('front', 'head', src.canvas);
      result.current.setCanvasRef('back', 'head', dst.canvas);
    });

    act(() => {
      result.current.copyCanvas('front', 'head', 'back', 'head');
    });

    expect(src.ctx.getImageData).toHaveBeenCalledWith(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );
    expect(dst.ctx.putImageData).toHaveBeenCalledWith(
      expect.objectContaining({ width: CANVAS_SIZE, height: CANVAS_SIZE }),
      0,
      0,
    );
  });

  it('copyCanvas does nothing when source canvas is missing', () => {
    const { result } = renderHook(() => useSketchCanvasRig());
    const dst = makeMockCanvas();

    act(() => {
      result.current.setCanvasRef('back', 'head', dst.canvas);
    });

    act(() => {
      result.current.copyCanvas('front', 'head', 'back', 'head');
    });

    expect(dst.ctx.putImageData).not.toHaveBeenCalled();
  });

  it('clearAll clears all registered canvases and undo stacks', () => {
    const { result } = renderHook(() => useSketchCanvasRig());
    const c1 = makeMockCanvas();
    const c2 = makeMockCanvas();

    act(() => {
      result.current.setCanvasRef('front', 'head', c1.canvas);
      result.current.setCanvasRef('back', 'torso', c2.canvas);
    });

    // Push an undo snapshot so there's state to clear
    act(() => {
      result.current.pushUndoSnapshot('front', 'head');
    });

    act(() => {
      result.current.clearAll();
    });

    expect(c1.ctx.clearRect).toHaveBeenCalledWith(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );
    expect(c2.ctx.clearRect).toHaveBeenCalledWith(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );

    // Undo after clearAll should do nothing (stack was cleared)
    act(() => {
      result.current.undo('front', 'head');
    });
    // putImageData should not have been called since the stack was emptied
    expect(c1.ctx.putImageData).not.toHaveBeenCalled();
  });

  it('pushUndoSnapshot + undo restores previous state', () => {
    const { result } = renderHook(() => useSketchCanvasRig());
    const mock = makeMockCanvas();

    act(() => {
      result.current.setCanvasRef(side, part, mock.canvas);
    });

    // Push a snapshot
    act(() => {
      result.current.pushUndoSnapshot(side, part);
    });

    expect(mock.ctx.getImageData).toHaveBeenCalledWith(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );

    // Now undo — should restore that snapshot
    act(() => {
      result.current.undo(side, part);
    });

    expect(mock.ctx.putImageData).toHaveBeenCalledWith(
      expect.objectContaining({ width: CANVAS_SIZE, height: CANVAS_SIZE }),
      0,
      0,
    );
  });

  it('undo does nothing when stack is empty', () => {
    const { result } = renderHook(() => useSketchCanvasRig());
    const mock = makeMockCanvas();

    act(() => {
      result.current.setCanvasRef(side, part, mock.canvas);
    });

    act(() => {
      result.current.undo(side, part);
    });

    expect(mock.ctx.putImageData).not.toHaveBeenCalled();
  });

  it('pushUndoSnapshot caps at 40 entries', () => {
    const { result } = renderHook(() => useSketchCanvasRig());
    const mock = makeMockCanvas();

    act(() => {
      result.current.setCanvasRef(side, part, mock.canvas);
    });

    // Push 45 snapshots
    act(() => {
      for (let i = 0; i < 45; i++) {
        result.current.pushUndoSnapshot(side, part);
      }
    });

    // Undo 40 times should work, 41st should not putImageData
    let undoCount = 0;
    for (let i = 0; i < 41; i++) {
      const callsBefore = mock.ctx.putImageData.mock.calls.length;
      act(() => {
        result.current.undo(side, part);
      });
      if (mock.ctx.putImageData.mock.calls.length > callsBefore) {
        undoCount++;
      }
    }
    expect(undoCount).toBe(40);
  });

  it('exportAll skips blank canvases', () => {
    const { result } = renderHook(() => useSketchCanvasRig());

    // Register a blank canvas
    const blank = makeMockCanvas({ blankPixels: true });
    act(() => {
      result.current.setCanvasRef('front', 'head', blank.canvas);
    });

    // Register a non-blank canvas
    const nonBlank = makeMockCanvas({ blankPixels: false });
    act(() => {
      result.current.setCanvasRef('front', 'torso', nonBlank.canvas);
    });

    let exported: ReturnType<typeof result.current.exportAll>;
    act(() => {
      exported = result.current.exportAll();
    });

    // Blank head should be skipped
    expect(exported!.front.head).toBeUndefined();
    // Non-blank torso should be present
    expect(exported!.front.torso).toBe('data:image/webp;base64,mockdata');
  });

  it('exportAll returns empty objects when no canvases registered', () => {
    const { result } = renderHook(() => useSketchCanvasRig());

    let exported: ReturnType<typeof result.current.exportAll>;
    act(() => {
      exported = result.current.exportAll();
    });

    expect(exported!).toEqual({ front: {}, back: {} });
  });

  it('clearPart clears only the specified canvas', () => {
    const { result } = renderHook(() => useSketchCanvasRig());
    const c1 = makeMockCanvas();
    const c2 = makeMockCanvas();

    act(() => {
      result.current.setCanvasRef('front', 'head', c1.canvas);
      result.current.setCanvasRef('front', 'torso', c2.canvas);
    });

    act(() => {
      result.current.clearPart('front', 'head');
    });

    expect(c1.ctx.clearRect).toHaveBeenCalledWith(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );
    expect(c2.ctx.clearRect).not.toHaveBeenCalled();
  });
});
