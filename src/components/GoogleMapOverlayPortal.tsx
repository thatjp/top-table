"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type OverlayPaneName =
  | "floatPane"
  | "mapPane"
  | "markerLayer"
  | "overlayLayer"
  | "overlayMouseTarget";

type Props = {
  map: google.maps.Map | null;
  pane?: OverlayPaneName;
  className?: string;
  children: React.ReactNode;
};

export function GoogleMapOverlayPortal({
  map,
  pane = "floatPane",
  className,
  children,
}: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const overlay = useMemo(() => {
    if (!map) return null;

    class OverlayPortalView extends google.maps.OverlayView {
      private node: HTMLDivElement | null = null;

      override onAdd() {
        const panes = this.getPanes();
        if (!panes) return;
        const node = document.createElement("div");
        node.style.position = "absolute";
        if (className) node.className = className;
        panes[pane].appendChild(node);
        this.node = node;
        setContainer(node);
      }

      override draw() {
        if (!this.node) return;
        this.node.style.left = "12px";
        this.node.style.top = "12px";
      }

      override onRemove() {
        if (this.node?.parentNode) {
          this.node.parentNode.removeChild(this.node);
        }
        this.node = null;
        setContainer(null);
      }
    }

    return new OverlayPortalView();
  }, [map, pane, className]);

  useEffect(() => {
    if (!overlay || !map) return;
    overlay.setMap(map);
    return () => {
      overlay.setMap(null);
    };
  }, [overlay, map]);

  if (!container) return null;
  return createPortal(children, container);
}
