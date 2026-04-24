import React, { useState, useMemo } from 'react';
import './DataTable.css';

const ROWS_PER_PAGE = 10;

export default function DataTable({ columns, data, onRowClick, onNewItem, newItemLabel, loading, readOnly }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortCol] ?? '';
      const bVal = b[sortCol] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const paginated = sorted.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const formatValue = (val, col) => {
    if (val === null || val === undefined) return '\u2014';
    if (col.type === 'money') {
      const num = parseFloat(val);
      if (isNaN(num)) return val;
      return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (col.type === 'date') {
      const d = new Date(val);
      return isNaN(d) ? val : d.toLocaleDateString('en-US');
    }
    if (col.type === 'datetime') {
      const d = new Date(val);
      return isNaN(d) ? val : d.toLocaleString('en-US');
    }
    if (col.type === 'status' || col.type === 'badge') {
      const statusClass = 'badge badge-' + String(val).toLowerCase().replace(/[\s/]+/g, '-');
      return <span className={statusClass}>{val}</span>;
    }
    if (col.type === 'percent') {
      return parseFloat(val).toFixed(1) + '%';
    }
    return String(val);
  };

  if (loading) {
    return (
      <div className="datatable-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="datatable-wrapper">
      <div className="datatable-toolbar">
        <div className="datatable-search">
          <span className="datatable-search-icon">{'\ud83d\udd0d'}</span>
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {!readOnly && onNewItem && (
          <button className="datatable-new-btn" onClick={onNewItem}>
            + {newItemLabel || 'New Item'}
          </button>
        )}
      </div>

      <div className="datatable-table-container">
        <table className="datatable-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={sortCol === col.key ? 'sorted' : ''}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortCol === col.key && (
                    <span className="datatable-sort-icon">
                      {sortDir === 'asc' ? ' \u25b2' : ' \u25bc'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="datatable-empty">
                    <div className="datatable-empty-icon">{'\ud83d\udcad'}</div>
                    <div className="datatable-empty-text">No records found</div>
                    <div className="datatable-empty-sub">
                      {search ? 'Try adjusting your search' : 'Create a new record to get started'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={row.id || row._id || idx} onClick={() => onRowClick && onRowClick(row)}>
                  {columns.map(col => (
                    <td key={col.key}>{formatValue(row[col.key], col)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="datatable-pagination">
          <span className="datatable-pagination-info">
            Showing {(page - 1) * ROWS_PER_PAGE + 1}-{Math.min(page * ROWS_PER_PAGE, sorted.length)} of {sorted.length}
          </span>
          <div className="datatable-pagination-controls">
            <button
              className="datatable-page-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              &#x276E;
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`datatable-page-btn ${page === pageNum ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="datatable-page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              &#x276F;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
