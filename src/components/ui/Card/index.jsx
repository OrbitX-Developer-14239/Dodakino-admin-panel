import React from "react";
import styles from "./Card.module.scss";

const Card = ({ children, className = "", title, subtitle, footer }) => {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};

export default Card;
