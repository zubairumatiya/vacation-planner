import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import Markdown from "react-markdown";
import styles from "../styles/VacationInfo.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

export default function VacationInfo({ refreshKey }: { refreshKey: number }) {
  const { tripId } = useParams<{ tripId: string }>();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [countryInfo, setCountryInfo] = useState<CountryInfoResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loggingOutRef?.current) return;
    if (!tripId || !token) return;

    const fetchCountryInfo = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiUrl}/country-info/${tripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          const resData = (await response.json()) as ApiErrorResponse;
          if (resData.error === "JwtError") {
            if (logout) {
              await logout();
            }
            return;
          }
          if (refreshInFlightRef == null) {
            console.error("Auth flight ref not set");
            return;
          }
          const continueReq: { token: string | null; err: boolean } =
            await refreshFn(apiUrl, refreshInFlightRef);
          if (!continueReq.err) {
            if (login && continueReq.token) {
              login(String(continueReq.token));
            }
            const retryRes = await fetch(`${apiUrl}/country-info/${tripId}`, {
              headers: { Authorization: `Bearer ${continueReq.token}` },
            });
            if (retryRes.ok) {
              const data = (await retryRes.json()) as CountryInfoResponse;
              setCountryInfo(data);
            } else {
              setError("Could not load country information.");
            }
          } else if (continueReq.err) {
            if (logout) {
              await logout();
            }
            return;
          }
        } else if (response.ok) {
          const data = (await response.json()) as CountryInfoResponse;
          setCountryInfo(data);
        } else if (response.status === 404) {
          setError("Country information not available for this trip.");
        } else {
          setError("Could not load country information.");
        }
      } catch {
        setError("Could not load country information.");
      } finally {
        setLoading(false);
      }
    };

    fetchCountryInfo();
  }, [tripId, token, refreshKey]);

  if (loading) {
    return <div className={styles.loading}>Loading country info...</div>;
  }

  if (error || !countryInfo) {
    return (
      <div className={styles.error}>{error || "No country info found."}</div>
    );
  }

  const formattedPop = Number(countryInfo.population).toLocaleString();
  const formattedGeo = Number(countryInfo.geography).toLocaleString();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.countryTitle}>{countryInfo.countryName}</h1>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Population</span>
          <span className={styles.statValue}>{formattedPop}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Area</span>
          <span className={styles.statValue}>
            {formattedGeo} <span className={styles.statUnit}>sq mi</span>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Language</span>
          <span className={styles.statValue}>{countryInfo.language}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Currency</span>
          <span className={styles.statValue}>{countryInfo.currency}</span>
        </div>
        {countryInfo.happinessRank && (
          <div className={styles.stat}>
            <span className={`${styles.statLabel}`}>Happiness Index</span>
            <span className={`${styles.statValue} ${styles.hapIndex}`}>
              {countryInfo.happinessRank}
              <span className={styles.statUnit}> / 146</span>
            </span>
          </div>
        )}
      </div>

      <hr className={styles.divider} />

      <div className={styles.infoBody}>
        <h1>Things to Know Before Traveling</h1>
        <Markdown>
          {countryInfo.info.replace(/^#\s+.+\n*/m, "")}
        </Markdown>
      </div>
    </div>
  );
}
