"use client";

type Props = {
  totalVenues: number;
  filteredCount: number;
  focusedVenueLabel: string | null;
  selectedVenueLabel: string | null;
  onResetView: () => void;
};

export function TablesMapHudOverlay({
  totalVenues,
  filteredCount,
  focusedVenueLabel,
  selectedVenueLabel,
  onResetView,
}: Props) {
  return (
    <div className="tables-map-hud-shell pointer-events-none">
      <div className="tables-map-hud pointer-events-auto">
        <div className="tables-map-hud-title">Map HUD</div>
        <div className="tables-map-hud-row">
          <span>Showing</span>
          <strong>
            {filteredCount} / {totalVenues}
          </strong>
        </div>
        <div className="tables-map-hud-row">
          <span>Focused</span>
          <strong>{focusedVenueLabel ?? "None"}</strong>
        </div>
        <div className="tables-map-hud-row">
          <span>Selected</span>
          <strong>{selectedVenueLabel ?? "None"}</strong>
        </div>
        <button type="button" onClick={onResetView} className="tables-map-hud-reset">
          Reset view
        </button>
      </div>
    </div>
  );
}
