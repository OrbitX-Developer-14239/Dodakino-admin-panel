import React from "react";
import styles from "./Button.module.scss";

/**
 * @param {boolean} loading - true bo'lsa tugmada aylanuvchi loader chiqadi
 *                            va tugma o'zi bloklanadi (ikki marta bosib bo'lmaydi)
 */
const Button = ({
  children,
  variant = "primary",
  className = "",
  loading = false,
  disabled = false,
  ...props
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;
