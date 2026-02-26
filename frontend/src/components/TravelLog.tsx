import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/TravelLog.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

interface UserCountry {
  id: string;
  countryId: number;
  countryName: string;
  continent: string;
  visibility: "public" | "friends" | "private";
  visitDate: string | null;
  numDays: number | null;
}

interface CountrySuggestion {
  id: number;
  name: string;
  continent: string;
}

const mapUserCountry = (raw: Record<string, unknown>): UserCountry => ({
  id: raw.id as string,
  countryId: raw.country_id as number,
  countryName: raw.country_name as string,
  continent: raw.continent as string,
  visibility: raw.visibility as "public" | "friends" | "private",
  visitDate: (raw.visit_date as string) || null,
  numDays: (raw.num_days as number) ?? null,
});

const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
];

// Eye SVGs
const EyeOpen = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width="1.25rem"
    height="1.25rem"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22 12.0002C20.2531 15.5764 15.8775 19 11.9998 19C8.12201 19 3.74646 15.5764 2 11.9998"
      stroke="#4a38ee"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22 12.0002C20.2531 8.42398 15.8782 5 12.0005 5C8.1227 5 3.74646 8.42314 2 11.9998"
      stroke="#4a38ee"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
      stroke="#4a38ee"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EyeHalf = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width="1.25rem"
    height="1.25rem"
  >
    <path
      d="M2 12c1.746-3.576 6.123-7 10-7 3.878 0 8.253 3.424 10 7-1.747-.4-6.122-1-10-1-3.877 0-8.254.6-10 1"
      fill="#4a38ee"
    />
    <path
      d="M22 12c-1.747 3.576-6.122 7-10 7s-8.254-3.424-10-7"
      stroke="#4a38ee"
    />
    <path
      d="M22 12c-1.747-3.576-6.122-7-10-7S3.746 8.424 2 12"
      stroke="#4a38ee"
    />
    <path
      d="M2 12c1.746-.4 6.123-1 10-1 3.878 0 8.253.6 10 1"
      stroke="#4a38ee"
    />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="#4a38ee" />
  </svg>
);

const EyeClosed = () => (
  <svg
    viewBox="0 0 24 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width="1.25rem"
    height="1.25rem"
  >
    <path
      d="M2.68936 6.70456C2.52619 6.32384 2.08528 6.14747 1.70456 6.31064C1.32384 6.47381 1.14747 6.91472 1.31064 7.29544L2.68936 6.70456ZM15.5872 13.3287L15.3125 12.6308L15.5872 13.3287ZM9.04145 13.7377C9.26736 13.3906 9.16904 12.926 8.82185 12.7001C8.47466 12.4742 8.01008 12.5725 7.78417 12.9197L9.04145 13.7377ZM6.37136 15.091C6.14545 15.4381 6.24377 15.9027 6.59096 16.1286C6.93815 16.3545 7.40273 16.2562 7.62864 15.909L6.37136 15.091ZM22.6894 7.29544C22.8525 6.91472 22.6762 6.47381 22.2954 6.31064C21.9147 6.14747 21.4738 6.32384 21.3106 6.70456L22.6894 7.29544ZM19 11.1288L18.4867 10.582V10.582L19 11.1288ZM19.9697 13.1592C20.2626 13.4521 20.7374 13.4521 21.0303 13.1592C21.3232 12.8663 21.3232 12.3914 21.0303 12.0985L19.9697 13.1592ZM11.25 16.5C11.25 16.9142 11.5858 17.25 12 17.25C12.4142 17.25 12.75 16.9142 12.75 16.5H11.25ZM16.3714 15.909C16.5973 16.2562 17.0619 16.3545 17.409 16.1286C17.7562 15.9027 17.8545 15.4381 17.6286 15.091L16.3714 15.909ZM5.53033 11.6592C5.82322 11.3663 5.82322 10.8914 5.53033 10.5985C5.23744 10.3056 4.76256 10.3056 4.46967 10.5985L5.53033 11.6592ZM2.96967 12.0985C2.67678 12.3914 2.67678 12.8663 2.96967 13.1592C3.26256 13.4521 3.73744 13.4521 4.03033 13.1592L2.96967 12.0985ZM12 13.25C8.77611 13.25 6.46133 11.6446 4.9246 9.98966C4.15645 9.16243 3.59325 8.33284 3.22259 7.71014C3.03769 7.3995 2.90187 7.14232 2.8134 6.96537C2.76919 6.87696 2.73689 6.80875 2.71627 6.76411C2.70597 6.7418 2.69859 6.7254 2.69411 6.71533C2.69187 6.7103 2.69036 6.70684 2.68957 6.70503C2.68917 6.70413 2.68896 6.70363 2.68892 6.70355C2.68891 6.70351 2.68893 6.70357 2.68901 6.70374C2.68904 6.70382 2.68913 6.70403 2.68915 6.70407C2.68925 6.7043 2.68936 6.70456 2 7C1.31064 7.29544 1.31077 7.29575 1.31092 7.29609C1.31098 7.29624 1.31114 7.2966 1.31127 7.2969C1.31152 7.29749 1.31183 7.2982 1.31218 7.299C1.31287 7.30062 1.31376 7.30266 1.31483 7.30512C1.31698 7.31003 1.31988 7.31662 1.32353 7.32483C1.33083 7.34125 1.34115 7.36415 1.35453 7.39311C1.38127 7.45102 1.42026 7.5332 1.47176 7.63619C1.57469 7.84206 1.72794 8.13175 1.93366 8.47736C2.34425 9.16716 2.96855 10.0876 3.8254 11.0103C5.53867 12.8554 8.22389 14.75 12 14.75V13.25ZM15.3125 12.6308C14.3421 13.0128 13.2417 13.25 12 13.25V14.75C13.4382 14.75 14.7246 14.4742 15.8619 14.0266L15.3125 12.6308ZM7.78417 12.9197L6.37136 15.091L7.62864 15.909L9.04145 13.7377L7.78417 12.9197ZM22 7C21.3106 6.70456 21.3107 6.70441 21.3108 6.70427C21.3108 6.70423 21.3108 6.7041 21.3109 6.70402C21.3109 6.70388 21.311 6.70376 21.311 6.70368C21.3111 6.70352 21.3111 6.70349 21.3111 6.7036C21.311 6.7038 21.3107 6.70452 21.3101 6.70576C21.309 6.70823 21.307 6.71275 21.3041 6.71924C21.2983 6.73223 21.2889 6.75309 21.2758 6.78125C21.2495 6.83757 21.2086 6.92295 21.1526 7.03267C21.0406 7.25227 20.869 7.56831 20.6354 7.9432C20.1669 8.69516 19.4563 9.67197 18.4867 10.582L19.5133 11.6757C20.6023 10.6535 21.3917 9.56587 21.9085 8.73646C22.1676 8.32068 22.36 7.9668 22.4889 7.71415C22.5533 7.58775 22.602 7.48643 22.6353 7.41507C22.6519 7.37939 22.6647 7.35118 22.6737 7.33104C22.6782 7.32097 22.6818 7.31292 22.6844 7.30696C22.6857 7.30398 22.6867 7.30153 22.6876 7.2996C22.688 7.29864 22.6883 7.29781 22.6886 7.29712C22.6888 7.29677 22.6889 7.29646 22.689 7.29618C22.6891 7.29604 22.6892 7.29585 22.6892 7.29578C22.6893 7.29561 22.6894 7.29544 22 7ZM18.4867 10.582C17.6277 11.3882 16.5739 12.1343 15.3125 12.6308L15.8619 14.0266C17.3355 13.4466 18.5466 12.583 19.5133 11.6757L18.4867 10.582ZM18.4697 11.6592L19.9697 13.1592L21.0303 12.0985L19.5303 10.5985L18.4697 11.6592ZM11.25 14V16.5H12.75V14H11.25ZM14.9586 13.7377L16.3714 15.909L17.6286 15.091L16.2158 12.9197L14.9586 13.7377ZM4.46967 10.5985L2.96967 12.0985L4.03033 13.1592L5.53033 11.6592L4.46967 10.5985Z"
      fill="#8f97a1"
    />
  </svg>
);

const VISIBILITY_ORDER: ("public" | "friends" | "private")[] = [
  "public",
  "friends",
  "private",
];

interface TravelLogProps {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  readOnly?: boolean;
  countries?: UserCountry[];
  userId?: string;
}

const TravelLog = ({
  authFetch,
  readOnly = false,
  countries: externalCountries,
  userId,
}: TravelLogProps) => {
  const [countries, setCountries] = useState<UserCountry[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CountrySuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openContinents, setOpenContinents] = useState<Set<string>>(new Set());
  const [showTooltip, setShowTooltip] = useState(false);
  const [pendingCountry, setPendingCountry] =
    useState<CountrySuggestion | null>(null);
  const [visitMonth, setVisitMonth] = useState("");
  const [visitYear, setVisitYear] = useState("");
  const [numDays, setNumDays] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (externalCountries) {
      setCountries(externalCountries);
      return;
    }
    const load = async () => {
      try {
        const res = await authFetch(`${apiUrl}/travel-log`);
        if (res.ok) {
          const data = await res.json();
          setCountries(
            (data.countries as Record<string, unknown>[]).map(mapUserCountry),
          );
        }
      } catch {
        // handled
      }
    };
    load();
  }, [externalCountries]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setHighlightedIndex(-1);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.length < 1) {
        setSuggestions([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await authFetch(
            `${apiUrl}/countries/search?q=${encodeURIComponent(value)}`,
          );
          if (res.ok) {
            const data = await res.json();
            // Filter out already-added countries
            const existingIds = new Set(countries.map((c) => c.countryId));
            setSuggestions(
              (
                data.countries as {
                  id: number;
                  name: string;
                  continent: string;
                }[]
              ).filter((c) => !existingIds.has(c.id)),
            );
          }
        } catch {
          // handled
        }
      }, 200);
    },
    [authFetch, countries],
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < suggestions.length - 1 ? prev + 1 : 0;
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : suggestions.length - 1;
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        selectCountry(suggestions[highlightedIndex]);
      }
    }
  };

  const scrollSuggestionIntoView = (index: number) => {
    if (!suggestionsRef.current) return;
    const items = suggestionsRef.current.children;
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  };

  const selectCountry = (suggestion: CountrySuggestion) => {
    setPendingCountry(suggestion);
    setVisitMonth("");
    setVisitYear("");
    setNumDays("");
    setSearchQuery("");
    setSuggestions([]);
  };

  const confirmAddCountry = async () => {
    if (!pendingCountry) return;
    try {
      const res = await authFetch(`${apiUrl}/travel-log`, {
        method: "POST",
        body: JSON.stringify({
          countryId: pendingCountry.id,
          visitDate:
            visitMonth && visitYear ? `${visitYear}-${visitMonth}` : undefined,
          numDays: numDays ? parseInt(numDays) : undefined,
        }),
      });
      if (res.ok || res.status === 201) {
        const data = await res.json();
        const newCountry = mapUserCountry(
          data.country as Record<string, unknown>,
        );
        setCountries((prev) =>
          [...prev, newCountry].sort((a, b) => {
            if (a.continent !== b.continent)
              return a.continent.localeCompare(b.continent);
            return a.countryName.localeCompare(b.countryName);
          }),
        );
        setOpenContinents((prev) => new Set(prev).add(newCountry.continent));
      }
    } catch {
      // handled
    }
    setPendingCountry(null);
    setShowSearch(false);
  };

  const cancelAddCountry = () => {
    setPendingCountry(null);
  };

  const cycleVisibility = async (country: UserCountry) => {
    const currentIdx = VISIBILITY_ORDER.indexOf(country.visibility);
    const next = VISIBILITY_ORDER[(currentIdx + 1) % 3];
    try {
      const res = await authFetch(`${apiUrl}/travel-log/${country.id}`, {
        method: "PATCH",
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) {
        setCountries((prev) =>
          prev.map((c) =>
            c.id === country.id ? { ...c, visibility: next } : c,
          ),
        );
      }
    } catch {
      // handled
    }
  };

  const toggleContinent = (continent: string) => {
    setOpenContinents((prev) => {
      const next = new Set(prev);
      if (next.has(continent)) next.delete(continent);
      else next.add(continent);
      return next;
    });
  };

  // Click outside to close search
  useEffect(() => {
    if (!showSearch) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchQuery("");
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSearch]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Group countries by continent
  const grouped: Record<string, UserCountry[]> = {};
  for (const c of countries) {
    if (!grouped[c.continent]) grouped[c.continent] = [];
    grouped[c.continent].push(c);
  }

  const getEyeIcon = (visibility: "public" | "friends" | "private") => {
    if (visibility === "public") return <EyeOpen />;
    if (visibility === "friends") return <EyeHalf />;
    return <EyeClosed />;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>Travel Log</span>
        {!readOnly && (
          <div
            className={styles.tooltipContainer}
            onMouseEnter={() => {
              timerRef.current = setTimeout(() => setShowTooltip(true), 500);
            }}
            onMouseLeave={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              setShowTooltip(false);
            }}
          >
            <button
              type="button"
              style={{
                padding: 0,
                backgroundColor: "transparent",
                border: "2px solid #6b7280",
                borderRadius: "50%",
                fontSize: "0.75rem",
                lineHeight: "1",
                color: "#6b7280",
                cursor: "help",
                width: "1.1rem",
                height: "1.1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
              }}
              aria-label="Visibility info"
            >
              ?
            </button>
            {showTooltip && (
              <div className={styles.tooltip}>
                <div className={styles.tooltipRow}>
                  <EyeOpen />
                  <span className={styles.tooltipText}>
                    Travel log visible to friends
                  </span>
                </div>
                <div className={styles.tooltipRow}>
                  <EyeHalf />
                  <span className={styles.tooltipText}>
                    Country visible, travel log private
                  </span>
                </div>
                <div className={styles.tooltipRow}>
                  <EyeClosed />
                  <span className={styles.tooltipText}>Completely private</span>
                </div>
              </div>
            )}
          </div>
        )}
        {!readOnly && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setShowSearch((prev) => !prev)}
            aria-label="Add country"
          >
            +
          </button>
        )}
      </div>

      {showSearch && !pendingCountry && (
        <div className={styles.searchWrapper} ref={searchRef}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search for a country..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />
          {suggestions.length > 0 && (
            <ul className={styles.suggestions} ref={suggestionsRef}>
              {suggestions.map((s, i) => (
                <li
                  key={s.id}
                  className={`${styles.suggestionItem} ${i === highlightedIndex ? styles.suggestionItemActive : ""}`}
                  onClick={() => selectCountry(s)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                >
                  {s.name}
                  <span className={styles.suggestionContinent}>
                    {s.continent}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {pendingCountry && (
        <div className={styles.detailsForm}>
          <div className={styles.detailsTitle}>{pendingCountry.name}</div>
          <div className={styles.detailsFields}>
            <label className={styles.detailsLabel}>
              <span>
                Date visited{" "}
                <span className={styles.optionalTag}>(optional)</span>
              </span>
              <div className={styles.dateSelects}>
                <select
                  className={styles.detailsInput}
                  value={visitMonth}
                  onChange={(e) => setVisitMonth(e.target.value)}
                >
                  <option value="">Month</option>
                  {[
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].map((name, i) => {
                    const val = String(i + 1).padStart(2, "0");
                    return (
                      <option key={val} value={val}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                <span className={styles.dateSeparator}>/</span>
                <select
                  className={styles.detailsInput}
                  value={visitYear}
                  onChange={(e) => setVisitYear(e.target.value)}
                >
                  <option value="">YYYY</option>
                  {Array.from({ length: 50 }, (_, i) => {
                    const yr = String(new Date().getFullYear() - i);
                    return (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    );
                  })}
                </select>
              </div>
            </label>
            <label className={styles.detailsLabel}>
              <span>
                Days spent{" "}
                <span className={styles.optionalTag}>(optional)</span>
              </span>
              <input
                type="number"
                className={styles.detailsInput}
                placeholder="e.g. 7"
                min="1"
                value={numDays}
                onChange={(e) => setNumDays(e.target.value)}
              />
            </label>
          </div>
          <div className={styles.detailsActions}>
            <button
              type="button"
              className={styles.detailsConfirmBtn}
              onClick={confirmAddCountry}
            >
              Add
            </button>
            <button
              type="button"
              className={styles.detailsCancelBtn}
              onClick={cancelAddCountry}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {CONTINENTS.map((continent) => {
        const items = grouped[continent] || [];
        const count = items.length;
        const isOpen = openContinents.has(continent);
        const displayName =
          continent === "Antarctica" ? `Antarctica 🥶` : continent;

        if (count === 0) {
          return (
            <div key={continent} className={styles.continentRowNoClick}>
              <span className={styles.continentName}>
                {displayName} (<span className={styles.countGray}>{count}</span>
                )
              </span>
            </div>
          );
        }

        return (
          <div key={continent}>
            <div
              className={styles.continentRow}
              onClick={() => toggleContinent(continent)}
            >
              <div
                className={`${styles.continentArrow} ${isOpen ? styles.continentArrowOpen : styles.continentArrowClosed}`}
              />
              <span className={styles.continentName}>
                {displayName} (
                <span className={styles.countGreen}>{count}</span>)
              </span>
            </div>
            {isOpen && (
              <ul className={styles.countryList}>
                {items.map((c) => {
                  const canClick =
                    !readOnly || c.visibility === "public";
                  const linkTo =
                    userId
                      ? `/user/${userId}/country/${c.id}`
                      : "#";
                  return (
                    <li key={c.id} className={styles.countryItem}>
                      {canClick && userId ? (
                        <Link
                          to={linkTo}
                          className={styles.countryLink}
                        >
                          {c.countryName}
                        </Link>
                      ) : (
                        <span>{c.countryName}</span>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          className={styles.eyeBtn}
                          onClick={() => cycleVisibility(c)}
                          aria-label={`Visibility: ${c.visibility}`}
                        >
                          {getEyeIcon(c.visibility)}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TravelLog;
