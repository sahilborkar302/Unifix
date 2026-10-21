import { useEffect, useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { StatusGlyph } from './ui';
import { PC_STATUS } from '../services/format';

/* The room as it really is: faculty screen at the front, PCs placed on a row/column grid.
   Empty cells (aisles / gaps) are left blank. In edit mode empty cells become "add PC" slots. */
export function Plan({ lab, computers, onSelect, selectedId, filter, editing, onEmptyClick, mini }) {
  const byPos = useMemo(() => {
    const m = {};
    computers.forEach((c) => { m[`${c.row}:${c.col}`] = c; });
    return m;
  }, [computers]);

  // pulse PCs whose colour just changed (live update)
  const prev = useRef({});
  const changed = new Set(computers.filter((c) => prev.current[c.id] && prev.current[c.id] !== c.status).map((c) => c.id));
  useEffect(() => { prev.current = Object.fromEntries(computers.map((c) => [c.id, c.status])); }, [computers]);

  const cells = [];
  for (let r = 1; r <= lab.rows; r++) {
    for (let c = 1; c <= lab.cols; c++) {
      const pc = byPos[`${r}:${c}`];
      if (!pc) {
        cells.push(
          editing ? (
            <button key={`${r}:${c}`} className="slot gap" onClick={() => onEmptyClick?.(r, c)} aria-label={`Add PC at row ${r}, column ${c}`} title="Add a PC here">
              <Plus size={18} />
            </button>
          ) : (
            <div key={`${r}:${c}`} className="slot gap" aria-hidden="true" />
          )
        );
      } else {
        const dim = filter && filter !== 'ALL' && pc.status !== filter;
        cells.push(
          <button
            key={pc.id}
            className={`pc ${pc.status} ${dim ? 'dim' : ''} ${selectedId === pc.id ? 'selected' : ''} ${changed.has(pc.id) ? 'pulse' : ''}`}
            onClick={() => onSelect?.(pc)}
            title={`${pc.label} – ${PC_STATUS[pc.status].label}`}
            aria-label={`${pc.label}, ${PC_STATUS[pc.status].label}`}
            tabIndex={mini ? -1 : 0}
          >
            <span className="screen">
              <StatusGlyph status={pc.status} />
              <b>{pc.label}</b>
            </span>
            <span className="stand" />
            <span className="base" />
          </button>
        );
      }
    }
  }
  return (
    <div className={`plan ${mini ? 'mini' : ''} ${editing ? 'editing' : ''}`} style={{ gridTemplateColumns: `repeat(${lab.cols}, var(--cell))` }}>
      {cells}
    </div>
  );
}

export function SeatingRoom({ lab, computers, filter, ...rest }) {
  return (
    <>
      <div className="faculty">📺 FACULTY / TV SCREEN</div>
      <div className="front-label">▲ Front of the classroom</div>
      <div className="plan-scroll">
        <Plan lab={lab} computers={computers} filter={filter} {...rest} />
      </div>
    </>
  );
}
