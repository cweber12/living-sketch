import { renderHook, waitFor } from '@testing-library/react';
import { useCacheSvgs } from '../use-cache-svgs';
import { svgStringToImage } from '@/lib/utils/svg-utils';
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';
import type { SvgParts } from '@/lib/types';

vi.mock('@/lib/utils/svg-utils', () => ({
  svgStringToImage: vi.fn(),
  // Re-export other things the module may export to avoid breaking imports
  affineFrom3Points: vi.fn(),
  getSvgSize: vi.fn(),
}));

const mockSvgStringToImage = svgStringToImage as ReturnType<typeof vi.fn>;

describe('useCacheSvgs', () => {
  let originalImage: typeof globalThis.Image;

  beforeEach(() => {
    vi.clearAllMocks();
    originalImage = globalThis.Image;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
  });

  it('handles SVG strings by delegating to svgStringToImage', async () => {
    const fakeImg = {
      naturalWidth: 100,
      naturalHeight: 200,
    } as HTMLImageElement;
    mockSvgStringToImage.mockResolvedValue(fakeImg);

    const svgs: SvgParts = { head: '<svg>head</svg>' };

    const { result } = renderHook(() => useCacheSvgs(svgs, null));

    await waitFor(() => {
      expect(result.current.head).toBe(fakeImg);
    });

    expect(mockSvgStringToImage).toHaveBeenCalledWith('<svg>head</svg>');
  });

  it('handles data URLs by creating Image elements', async () => {
    // Mock window.Image so setting .src triggers .onload
    const fakeImg: Partial<HTMLImageElement> = {
      naturalWidth: 50,
      naturalHeight: 75,
      width: 50,
      height: 75,
    };

    globalThis.Image = vi.fn().mockImplementation(function (
      this: HTMLImageElement,
    ) {
      Object.assign(this, fakeImg);
      // When src is set, trigger onload async
      Object.defineProperty(this, 'src', {
        set: (_val: string) => {
          setTimeout(() => {
            if (this.onload)
              (this.onload as (ev: Event) => void).call(
                this,
                new Event('load'),
              );
          }, 0);
        },
        get: () => '',
      });
    }) as unknown as typeof Image;

    const dataUrl = 'data:image/webp;base64,AAAA';
    const svgs: SvgParts = { torso: dataUrl };

    const { result } = renderHook(() => useCacheSvgs(svgs, null));

    await waitFor(() => {
      expect(result.current.torso).toBeDefined();
    });

    // Should NOT have delegated to svgStringToImage for data URLs
    expect(mockSvgStringToImage).not.toHaveBeenCalled();
  });

  it('skips empty/null entries', async () => {
    mockSvgStringToImage.mockResolvedValue({
      naturalWidth: 10,
      naturalHeight: 10,
    } as HTMLImageElement);

    const svgs: SvgParts = {
      head: '<svg>head</svg>',
      torso: '', // empty string
    };

    const { result } = renderHook(() => useCacheSvgs(svgs, null));

    await waitFor(() => {
      expect(result.current.head).toBeDefined();
    });

    // Empty torso should be skipped
    expect(result.current.torso).toBeUndefined();
    // svgStringToImage should only have been called for 'head'
    expect(mockSvgStringToImage).toHaveBeenCalledTimes(1);
    expect(mockSvgStringToImage).toHaveBeenCalledWith('<svg>head</svg>');
  });

  it('updates torso dimensions when torso part loads', async () => {
    const fakeImg = {
      naturalWidth: 120,
      naturalHeight: 240,
      width: 120,
      height: 240,
    } as HTMLImageElement;
    mockSvgStringToImage.mockResolvedValue(fakeImg);

    const torsoDims = new TorsoDimensions();
    const updateSpy = vi.spyOn(torsoDims, 'updateTorsoSvgDimensions');

    const svgs: SvgParts = { torso: '<svg>torso</svg>' };

    renderHook(() => useCacheSvgs(svgs, torsoDims));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(240, 120);
    });
  });

  it('does not update torso dimensions for non-torso parts', async () => {
    const fakeImg = {
      naturalWidth: 50,
      naturalHeight: 80,
    } as HTMLImageElement;
    mockSvgStringToImage.mockResolvedValue(fakeImg);

    const torsoDims = new TorsoDimensions();
    const updateSpy = vi.spyOn(torsoDims, 'updateTorsoSvgDimensions');

    const svgs: SvgParts = { head: '<svg>head</svg>' };

    const { result } = renderHook(() => useCacheSvgs(svgs, torsoDims));

    await waitFor(() => {
      expect(result.current.head).toBeDefined();
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('does not re-process when svgs reference is the same', async () => {
    const fakeImg = { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement;
    mockSvgStringToImage.mockResolvedValue(fakeImg);

    const svgs: SvgParts = { head: '<svg>head</svg>' };

    const { result, rerender } = renderHook(({ s }) => useCacheSvgs(s, null), {
      initialProps: { s: svgs },
    });

    await waitFor(() => {
      expect(result.current.head).toBeDefined();
    });

    const callCount = mockSvgStringToImage.mock.calls.length;

    // Rerender with the same object — should skip
    rerender({ s: svgs });

    // Give time for any async processing
    await new Promise((r) => setTimeout(r, 50));

    expect(mockSvgStringToImage.mock.calls.length).toBe(callCount);
  });
});
