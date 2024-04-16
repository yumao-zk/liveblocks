import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import React, { useLayoutEffect, useRef } from "react";

import { useLastActiveSelection } from "./CommentPluginProvider";

export function LastActiveSelection() {
  const [editor] = useLexicalComposerContext();
  const selection = useLastActiveSelection();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    let observer: ResizeObserver | undefined;
    if (container === null) return;

    // Look for contentEditable, then use its parent so we can place markerContainer next to it
    const editorRef = editor.getRootElement();
    // Look for existing marker container
    let markerContainer = editorRef?.parentNode?.querySelector(".lb-marker-container") as HTMLDivElement | undefined;
    if (editorRef && !markerContainer) {
      markerContainer = document.createElement("div");
      // TODO: move these to a class?
      markerContainer.style.position = "absolute";
      markerContainer.style.height = "100%";
      markerContainer.style.width = "100%";
      markerContainer.style.top = "0";
      markerContainer.style.left = "0";
      markerContainer.style.pointerEvents = "none";
      markerContainer.className = "lb-marker-container";
      editorRef.parentNode?.appendChild(markerContainer);
    }
    // If we weren't able to find the editor ref then use our own container TODO: allow user to provide containerRef
    if (!markerContainer) {
      markerContainer = container;
    }

    // Function that draws rectangles around text (markers)
    function drawRects() {
      if (!markerContainer) return;
      // Remove all existing children of the container
      while (markerContainer.firstChild) {
        markerContainer.removeChild(markerContainer.firstChild);
      }

      // nothing to render when there's no selection
      if (selection === null) return;
      const range = createDOMRange(
        editor,
        selection.anchor.node,
        selection.anchor.offset,
        selection.focus.node,
        selection.focus.offset
      );

      if (range === null) return;
      const rects = createRectsFromDOMRange(editor, range);

      for (const rect of rects) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.top = `${rect.top - markerContainer.getBoundingClientRect().top}px`;
        div.style.left = `${rect.left - markerContainer.getBoundingClientRect().left
          }px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.backgroundColor = "rgb(255, 212, 0)";
        div.style.opacity = "0.5";
        div.style.pointerEvents = "none";
        markerContainer.appendChild(div);
      }
    }

    let unsubUpdateHandler = () => { };

    // Observer resizes and edit listener, but only when selection is not null
    if (markerContainer && selection !== null) {
      observer = new ResizeObserver(drawRects);
      observer.observe(markerContainer as HTMLElement);
      unsubUpdateHandler = editor.registerUpdateListener(drawRects);
    }

    // draw or clear rects
    drawRects();

    return () => {
      // Cleans up observer and updeate listener
      observer?.disconnect();
      observer = undefined;
      unsubUpdateHandler();
    }
  }, [editor, selection]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        height: "100%",
        width: "100%",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    />
  );
}