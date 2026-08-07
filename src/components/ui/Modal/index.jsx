import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.scss";

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "overlay";
    }
    return () => {
      document.body.style.overflow = "overlay";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.modal_overlay} onClick={onClose}>
      <div 
        className={styles.modal_content} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modal_header}>
          <h3>{title}</h3>
          <button className={styles.close_btn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.modal_body}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
