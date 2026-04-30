import React from 'react';

interface ConfirmUploadModalProps {
  onClose: () => void;
  onContinue: () => void;
}

const ConfirmUploadModal: React.FC<ConfirmUploadModalProps> = ({ onClose, onContinue }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-upload-title"
      className="confirm-upload-overlay"
      onClick={onClose}
    >
      <div
        className="confirm-upload-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-upload-title" id="confirm-upload-title">
          Confirm Upload
        </div>
        <div className="confirm-upload-body">
          This will take you back to the Upload page to refresh analytics.
          <br />
          Are you sure you want to continue?
        </div>
        <div className="confirm-upload-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={onContinue}
          >
            Continue to Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUploadModal;
