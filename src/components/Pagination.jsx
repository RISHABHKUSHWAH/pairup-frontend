import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

/**
 * Generates array of page numbers and ellipsis tokens for pagination.
 */
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [1];
  if (currentPage > 3) {
    pages.push('ellipsis-start');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis-end');
  }

  pages.push(totalPages);
  return pages;
}

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemLabel = 'items',
  showInfo = true,
  pageSizeOptions,
  onPageSizeChange,
  compact = false,
  className = '',
  style = {},
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (itemsPerPage || 0))) {
    return null;
  }

  const startItem = totalItems !== undefined && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems !== undefined && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div
      className={`ledger-pagination-bar ${compact ? 'compact' : ''} ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: compact ? '8px' : '12px',
        padding: compact ? '12px 0 0 0' : '13px 20px',
        background: compact ? 'transparent' : 'var(--surface)',
        borderTop: compact ? '1px solid var(--grid)' : '1px solid var(--grid-strong)',
        ...style,
      }}
      aria-label="Pagination"
    >
      {/* Items count summary */}
      {showInfo && totalItems !== undefined && (
        <div
          className="ledger-pagination-info"
          style={{
            fontSize: compact ? '12px' : '12.5px',
            color: 'var(--ink-muted)',
          }}
        >
          {totalItems === 0 ? (
            <span>No {itemLabel}</span>
          ) : (
            <span>
              Showing <strong style={{ color: 'var(--ink)' }}>{startItem}</strong>–
              <strong style={{ color: 'var(--ink)' }}>{endItem}</strong> of{' '}
              <strong style={{ color: 'var(--ink)' }}>{totalItems}</strong> {itemLabel}
            </span>
          )}
        </div>
      )}

      {/* Controls: page size + nav */}
      <div
        className="ledger-pagination-controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? '8px' : '14px',
          flexWrap: 'wrap',
          marginLeft: showInfo && totalItems !== undefined ? 'auto' : undefined,
        }}
      >
        {/* Optional Page Size Selector */}
        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <div className="ledger-page-size-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="ledger-page-size-label" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Per page:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="ledger-page-size-select"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '6px',
                padding: '3px 6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
              aria-label={`${itemLabel} per page`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page navigation buttons */}
        {totalPages > 1 && (
          <div className="ledger-page-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Previous button */}
            <button
              type="button"
              className="ledger-page-btn nav-arrow"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeftIcon size={14} />
            </button>

            {/* Page number buttons */}
            {pageNumbers.map((item, idx) => {
              if (typeof item === 'string') {
                return (
                  <span key={`${item}-${idx}`} className="ledger-page-ellipsis">
                    …
                  </span>
                );
              }
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  className={`ledger-page-btn ${currentPage === item ? 'active' : ''}`}
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={currentPage === item ? 'page' : undefined}
                >
                  {item}
                </button>
              );
            })}

            {/* Next button */}
            <button
              type="button"
              className="ledger-page-btn nav-arrow"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
