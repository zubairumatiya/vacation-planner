import { useState } from "react";

type QuestionnaireAnswers = {
  budget: string;
  interests: string[];
  dietaryRestrictions: string;
  pace: string;
  travelingWithKidsOrElderly: string;
  accessibilityNeeds: string;
  tourPreference: string;
  accommodationType: string;
  mustSeeExperiences: string;
  startTimePreference: string;
  transportMode: string;
};

const INTEREST_OPTIONS = [
  "Culture",
  "Food",
  "Nightlife",
  "Nature",
  "Shopping",
  "History",
  "Adventure",
  "Relaxation",
  "Wellness/Spa",
  "Art",
  "Music",
  "Sports",
  "Photography",
  "Architecture",
  "Wildlife",
  "Beach",
  "Markets/Street Food",
  "Wine/Brewery",
];

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
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(
    initialAnswers ?? {
      budget: "",
      interests: [],
      dietaryRestrictions: "",
      pace: "",
      travelingWithKidsOrElderly: "",
      accessibilityNeeds: "",
      tourPreference: "",
      accommodationType: "",
      mustSeeExperiences: "",
      startTimePreference: "",
      transportMode: "",
    },
  );

  const toggleInterest = (interest: string) => {
    setAnswers((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const updateField = (
    field: keyof QuestionnaireAnswers,
    value: string
  ) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button type="button" onClick={onClose} style={closeButtonStyle}>
          &times;
        </button>
        <h2 style={titleStyle}>Plan Your Trip with AI</h2>
        <p style={subtitleStyle}>
          Answer these questions so AI can create a personalized itinerary for
          you.
        </p>

        <div style={questionsContainerStyle}>
          {/* 1. Budget */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              1. What&apos;s your total budget for this trip?
            </label>
            <input
              type="text"
              placeholder="e.g. $2,000"
              value={answers.budget}
              onChange={(e) => updateField("budget", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 2. Interests */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              2. What are your main interests? (select all that apply)
            </label>
            <div style={chipsContainerStyle}>
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  type="button"
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  style={{
                    ...chipStyle,
                    ...(answers.interests.includes(interest)
                      ? chipActiveStyle
                      : {}),
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Dietary restrictions */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              3. Any dietary restrictions or food allergies?
            </label>
            <input
              type="text"
              placeholder="e.g. Vegetarian, nut allergy"
              value={answers.dietaryRestrictions}
              onChange={(e) =>
                updateField("dietaryRestrictions", e.target.value)
              }
              style={inputStyle}
            />
          </div>

          {/* 4. Pace */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              4. What&apos;s your preferred pace?
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {([
                ["Packed", "Something every hour from your start time to evening"],
                ["Moderate", "Fewer activities with breathing room between them"],
                ["Relaxed", "Just a few highlights per day"],
              ] as const).map(([option, desc]) => (
                <label key={option} style={{ ...radioLabelStyle, flexDirection: "column", alignItems: "flex-start", gap: "0.1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <input
                      type="radio"
                      name="pace"
                      value={option}
                      checked={answers.pace === option}
                      onChange={() => updateField("pace", option)}
                      style={radioInputStyle}
                    />
                    {option}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#888", marginLeft: "1.35rem" }}>{desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Kids or elderly */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              5. Are you traveling with children or elderly?
            </label>
            <div style={radioGroupStyle}>
              {["Yes", "No"].map((option) => (
                <label key={option} style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="kidsElderly"
                    value={option}
                    checked={answers.travelingWithKidsOrElderly === option}
                    onChange={() =>
                      updateField("travelingWithKidsOrElderly", option)
                    }
                    style={radioInputStyle}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* 6. Accessibility */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              6. Any mobility or accessibility needs?
            </label>
            <input
              type="text"
              placeholder="e.g. Wheelchair accessible, limited walking"
              value={answers.accessibilityNeeds}
              onChange={(e) =>
                updateField("accessibilityNeeds", e.target.value)
              }
              style={inputStyle}
            />
          </div>

          {/* 7. Tour preference */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              7. Do you prefer guided tours or self-exploration?
            </label>
            <div style={radioGroupStyle}>
              {["Guided tours", "Self-exploration", "Mix of both"].map(
                (option) => (
                  <label key={option} style={radioLabelStyle}>
                    <input
                      type="radio"
                      name="tourPreference"
                      value={option}
                      checked={answers.tourPreference === option}
                      onChange={() => updateField("tourPreference", option)}
                      style={radioInputStyle}
                    />
                    {option}
                  </label>
                )
              )}
            </div>
          </div>

          {/* 8. Accommodation */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              8. What type of accommodation do you prefer?
            </label>
            <div style={radioGroupStyle}>
              {["Budget", "Mid-range", "Luxury"].map((option) => (
                <label key={option} style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="accommodation"
                    value={option}
                    checked={answers.accommodationType === option}
                    onChange={() => updateField("accommodationType", option)}
                    style={radioInputStyle}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* 9. Must-see */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              9. Any must-see landmarks or experiences?
            </label>
            <input
              type="text"
              placeholder="e.g. Acropolis, local cooking class"
              value={answers.mustSeeExperiences}
              onChange={(e) =>
                updateField("mustSeeExperiences", e.target.value)
              }
              style={inputStyle}
            />
          </div>

          {/* 10. Start time */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              10. What time do you prefer to start your day?
            </label>
            <div style={radioGroupStyle}>
              {["Early bird", "Mid-morning", "Late riser"].map((option) => (
                <label key={option} style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="startTime"
                    value={option}
                    checked={answers.startTimePreference === option}
                    onChange={() =>
                      updateField("startTimePreference", option)
                    }
                    style={radioInputStyle}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
          {/* 11. Transport */}
          <div style={questionBlockStyle}>
            <label style={labelStyle}>
              11. How will you be getting around?
            </label>
            <div style={radioGroupStyle}>
              {[
                "Walking",
                "Public transit (bus/metro/tram)",
                "Rental car",
                "Taxi/rideshare",
                "Bicycle",
                "Unsure",
              ].map((option) => (
                <label key={option} style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="transportMode"
                    value={option}
                    checked={answers.transportMode === option}
                    onChange={() => updateField("transportMode", option)}
                    style={radioInputStyle}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </div>

        <button type="button" onClick={handleSubmit} style={submitButtonStyle}>
          Submit
        </button>
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
  maxWidth: "640px",
  maxHeight: "85vh",
  overflowY: "auto",
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
  marginBottom: "1.5rem",
};

const questionsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const questionBlockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.95rem",
};

const inputStyle: React.CSSProperties = {
  background: "#2a2a2c",
  border: "1px solid #444",
  borderRadius: "8px",
  padding: "0.6rem 0.75rem",
  color: "white",
  fontSize: "0.9rem",
  outline: "none",
};

const chipsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const chipStyle: React.CSSProperties = {
  background: "#2a2a2c",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#555",
  borderRadius: "20px",
  padding: "0.4rem 0.9rem",
  color: "white",
  cursor: "pointer",
  fontSize: "0.85rem",
  transition: "all 0.15s",
};

const chipActiveStyle: React.CSSProperties = {
  background: "#4285F4",
  borderColor: "#4285F4",
};

const radioGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
};

const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  cursor: "pointer",
  fontSize: "0.9rem",
};

const radioInputStyle: React.CSSProperties = {
  accentColor: "#4285F4",
};

const submitButtonStyle: React.CSSProperties = {
  marginTop: "1.5rem",
  width: "100%",
  padding: "0.75rem",
  background: "linear-gradient(135deg, #4285F4, #a855f7)",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

export default AiTripQuestionnaire;
export type { QuestionnaireAnswers };
