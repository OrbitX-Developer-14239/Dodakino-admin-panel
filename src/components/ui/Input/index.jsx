import React from "react";
import styles from "./Input.module.scss";

const Input = ({ label, error, className = "", ...props }) => {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        className={`${styles.input} ${error ? styles.error_input : ""}`}
        {...props}
      />
      {error && <span className={styles.error_text}>{error}</span>}
    </div>
  );
};

export default Input;
