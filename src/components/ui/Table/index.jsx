import React from "react";
import styles from "./Table.module.scss";

const Table = ({ columns, data, isLoading, onRowClick }) => {
  if (isLoading) {
    return <div className={styles.loading}>Ma'lumotlar yuklanmoqda...</div>;
  }

  if (!data || data.length === 0) {
    return <div className={styles.empty}>Hech qanday ma'lumot topilmadi</div>;
  }

  return (
    <div className={styles.table_wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={onRowClick ? styles.clickable_row : ""}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
