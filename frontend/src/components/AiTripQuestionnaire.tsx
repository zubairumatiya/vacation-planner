import { useState } from "react";

type QuestionnaireAnswers = {
  notes: string;
};

type AiTripQuestionnaireProps = {
  onClose: () => void;
  onSubmit: (answers: QuestionnaireAnswers) => void;
  initialAnswers?: QuestionnaireAnswers;
};

const AiTripQuestionnaire = ({
  onClose,
  onSubmit,
  initialAnswers,
}: AiTripQuestionnaireProps) => {
  const [notes, setNotes] = useState(initialAnswers?.notes ?? "");

  const handleSubmit = () => {
    onSubmit({ notes });
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button type="button" onClick={onClose} style={closeButtonStyle}>
          &times;
        </button>
        <h2 style={titleStyle}>Trip Notes</h2>
        <p style={subtitleStyle}>
          Anything AI should remember about your trip?
        </p>

        <textarea
          placeholder="Dietary restrictions, budget, travel style, pace preferences, must-see spots, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          style={textareaStyle}
          rows={5}
        />
        <div style={counterStyle}>
          {notes.length} / 500
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button type="button" onClick={handleSubmit} style={submitButtonStyle}>
            Save
          </button>
          <button type="button" onClick={onClose} style={closeTextButtonStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
};

const modalStyle: React.CSSProperties = {
  background: "#1e1e20",
  borderRadius: "16px",
  padding: "2rem",
  width: "90vw",
  maxWidth: "500px",
  position: "relative",
  color: "white",
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "1rem",
  right: "1rem",
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: "1.5rem",
  cursor: "pointer",
  lineHeight: 1,
  padding: "0.25rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  marginBottom: "0.25rem",
};

const subtitleStyle: React.CSSProperties = {
  color: "#aaa",
  fontSize: "0.9rem",
  marginBottom: "1rem",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "#2a2a2c",
  border: "1px solid #444",
  borderRadius: "8px",
  padding: "0.75rem",
  color: "white",
  fontSize: "0.9rem",
  outline: "none",
  resize: "vertical",
  minHeight: "100px",
  boxSizing: "border-box",
};

const counterStyle: React.CSSProperties = {
  textAlign: "right",
  fontSize: "0.75rem",
  color: "#666",
  marginTop: "0.25rem",
};

const submitButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem",
  background: "linear-gradient(135deg, #2fe782, #6366f1)",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

const closeTextButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem",
  background: "transparent",
  color: "#999",
  border: "1px solid #444",
  borderRadius: "10px",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

export default AiTripQuestionnaire;
export type { QuestionnaireAnswers };
