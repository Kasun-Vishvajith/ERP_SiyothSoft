type LookupPagerProps = {
  label: string;
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function LookupPager({ label, page, totalPages, disabled = false, onPageChange }: LookupPagerProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="lookup-pager" aria-label={`${label} lookup pagination`}>
      <span>{label} page {page + 1} of {totalPages}</span>
      <div className="lookup-pager__buttons">
        <button className="button button--text" type="button" disabled={disabled || page === 0} onClick={() => onPageChange(page - 1)}>Previous</button>
        <button className="button button--text" type="button" disabled={disabled || page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
