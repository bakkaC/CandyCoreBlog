import { useEffect, useMemo, useState } from 'react';
import type { ExcalidrawSceneData } from '../../lib/excalidraw';

interface ExcalidrawPreviewProps {
  align?: 'center' | 'left';
  caption?: string;
  height?: number;
  scene: ExcalidrawSceneData;
  shadow?: boolean;
  size?: 'full' | 'lg' | 'md' | 'sm' | 'xl';
  title?: string;
  width?: string;
}

export function ExcalidrawPreview({
  align = 'center',
  caption,
  height = 420,
  scene,
  shadow = false,
  size = 'full',
  title,
  width,
}: ExcalidrawPreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [svgMarkup, setSvgMarkup] = useState('');

  const label = title ?? scene.sourcePath.split('/').at(-1) ?? 'Excalidraw';
  const sceneSignature = useMemo(
    () => JSON.stringify([scene.sourcePath, scene.elements.length, Object.keys(scene.files).length]),
    [scene]
  );
  const sizeWidthMap = {
    full: '100%',
    xl: '72rem',
    lg: '56rem',
    md: '44rem',
    sm: '32rem',
  } as const;
  const previewMaxWidth = width ?? sizeWidthMap[size];
  const figureStyle = { maxWidth: previewMaxWidth };
  const figureClassName = `w-full ${align === 'left' ? 'mr-auto' : 'mx-auto'}`;
  const triggerClassName = [
    'block w-full overflow-hidden rounded-xl text-left transition duration-200',
    shadow ? 'shadow-[0_18px_40px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:shadow-[0_24px_56px_rgba(15,23,42,0.14)]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    let disposed = false;

    async function renderScene() {
      try {
        setError(null);
        const { exportToSvg } = await import('@excalidraw/excalidraw');
        const svg = await exportToSvg({
          elements: scene.elements.filter(
            (element) => !element.isDeleted
          ) as never,
          appState: {
            exportBackground: true,
            viewBackgroundColor: '#ffffff',
            ...(scene.appState ?? {}),
          } as never,
          files: scene.files,
          exportPadding: 0,
        });

        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('class', 'cc-excalidraw-svg');

        if (!disposed) {
          setSvgMarkup(svg.outerHTML);
        }
      } catch (reason) {
        if (!disposed) {
          const message =
            reason instanceof Error ? reason.message : '未知渲染错误';
          setError(message);
        }
      }
    }

    void renderScene();

    return () => {
      disposed = true;
    };
  }, [scene, sceneSignature]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  return (
    <>
      <figure className={figureClassName} style={figureStyle}>
        <button
          type="button"
          className={triggerClassName}
          onClick={() => {
            if (svgMarkup) {
              setExpanded(true);
            }
          }}
          aria-label={`查看 ${label}`}
          disabled={!svgMarkup}
        >
          <div
            className="overflow-auto rounded-xl"
            style={{ minHeight: `${height}px` }}
          >
          {error ? (
            <div className="flex min-h-[12rem] items-center justify-center px-6 py-8 text-center text-sm leading-6 text-rose-700">
              Excalidraw 渲染失败: {error}
            </div>
          ) : svgMarkup ? (
            <div
              className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="flex min-h-[12rem] items-center justify-center px-6 py-8 text-sm text-slate-500">
              正在生成 Excalidraw 预览...
            </div>
          )}
          </div>
        </button>

        {caption ? (
          <figcaption className="mt-3 px-1 text-sm leading-6 text-muted-foreground">
            {caption}
          </figcaption>
        ) : null}
      </figure>

      {expanded && svgMarkup ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative inline-flex max-h-[100dvh] max-w-[min(96vw,1400px)] items-center justify-center p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/68 text-white backdrop-blur-sm transition hover:bg-slate-950/82"
              onClick={() => setExpanded(false)}
              aria-label="关闭预览"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6 18 18" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
            <div
              className="max-w-full rounded-xl shadow-[0_28px_80px_rgba(15,23,42,0.35)] [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-[calc(100dvh-5rem)] [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ExcalidrawPreview;
