import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/AddVacationForm.module.css";
import { AuthContext } from "../context/AuthContext.tsx";
import clsx from "clsx";
import { AutocompleteWebComponent } from "../components/map-components/autocomplete-webcomponent.tsx";
import refreshFn from "../utils/refreshFn.ts";
const apiUrl = import.meta.env.VITE_API_URL;

const QuestionMarkIcon = ({
  ariaLabel,
  title,
  description,
}: {
  ariaLabel?: string;
  title: string;
  description: string;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setShowTooltip(true), 1000);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="relative inline-flex mr-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        style={{
          padding: 0,
          backgroundColor: "transparent",
          border: "2px solid #6b7280",
          borderRadius: "50%",
          fontSize: "0.875rem",
          lineHeight: "1",
          color: "#6b7280",
          cursor: "help",
          width: "1.25rem",
          height: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "600",
        }}
        aria-label={ariaLabel ?? title}
      >
        ?
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-md whitespace-normal pointer-events-none w-48">
          <p className="font-medium">{title}</p>
          <p className="text-gray-300 text-xs mt-1">{description}</p>
        </div>
      )}
    </div>
  );
};

type Props = {
  preFill?: {
    tripName: string;
    location: string;
    startDate: string;
    endDate: string;
    id: string;
    isPublic?: boolean;
    isOpenInvite?: boolean;
  };
  disableOrNah: (fieldError: boolean) => void;
  submit: boolean;
  method?: string;
  sendSubmissionResult?: (result: boolean) => void;
};

type GValues = {
  id: string;
  location: string;
  vp: { south: number; west: number; north: number; east: number };
};
const VacationForm = (props?: Props) => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;

  const loggingOutRef = auth?.loggingOutRef;

  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const oneYear = date.toISOString().slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);
  const date1 = new Date();
  date1.setFullYear(date1.getFullYear() + 10);
  const tenYearsFromNow = date1.toISOString().slice(0, 10);
  const [sHtmlDateErr, setSHtmlDateErr] = useState<boolean>(true);
  const [eHtmlDateErr, setEHtmlDateErr] = useState<boolean>(true);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const [gValues, setGValues] = useState<GValues | null>(null);
  const [clickClear, setClickClear] = useState<boolean>(true);
  const autocompleteRef = useRef<{
    handleKeyDown: (key: string) => void;
  }>(null);
  const tripNameRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    requestAnimationFrame(() => {
      tripNameRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        locationInputRef.current &&
        !locationInputRef.current.contains(e.target as Node) // I know this is a DOM node; let me call .contains() on it.
      ) {
        setHideSuggestions(true);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (loggingOutRef?.current) return;
    const getGValues = async () => {
      try {
        console.log("getting add vacation");
        const result = await fetch(
          `${apiUrl}/add-vacation/${props?.preFill?.id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (result.ok) {
          const data = (await result.json()) as AddVacationGetResponse;
          setGValues({
            id: data.gId,
            location: props?.preFill?.location ?? data.gLocation,
            vp: data.gVp,
          });
        } else if (result.status === 401) {
          const resData = (await result.json()) as ApiErrorResponse;
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
            const retryReq = await fetch(
              `${apiUrl}/add-vacation/${props?.preFill?.id}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${continueReq.token}`,
                },
              },
            );
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const retryData =
                (await retryReq.json()) as AddVacationGetResponse;
              setGValues({
                // change
                id: retryData.gId,
                location: props?.preFill?.location ?? retryData.gLocation,
                vp: retryData.gVp,
              });
            }
          } else if (continueReq.err) {
            if (logout) {
              await logout();
            }
            return;
          }
        } else if (result.status === 403) {
          alert("You do not have permission to access this resource");
        } else if (result.status === 404) {
          alert("Error: Trip not found");
        }
      } catch (err) {
        console.log("Failed to fetch gValue:", err);
      }
    };
    if (props?.method === "PATCH") {
      if (!props.preFill?.location) {
        console.log("no prefill location, falling back on db location");
      }
      getGValues();
    }
  }, []);

  const storeValues = (id: string, location: string, vp: Viewport) => {
    // for NEXT time: send these to db of trip and load it into map when we load our map in the edit page
    setClickClear(true);
    const bounds: GValues["vp"] = {
      south: vp.low.latitude,
      west: vp.low.longitude,
      north: vp.high.latitude,
      east: vp.high.longitude,
    };
    setGValues({ id, location, vp: bounds });
  };

  const prefixZero = (x: number): string => {
    if (x <= 9) {
      return "0" + x;
    }
    return "" + x;
  };

  const getLocalDate = (toBeConverted: Date): string => {
    const year = toBeConverted.getFullYear();
    const month = prefixZero(toBeConverted.getMonth() + 1);
    const day = prefixZero(toBeConverted.getDate());
    return year + "-" + month + "-" + day;
  };

  let startPreFill;
  if (!props?.preFill?.startDate) {
    startPreFill = undefined;
  } else {
    startPreFill = getLocalDate(new Date(props?.preFill?.startDate));
  }

  let endPreFill;
  if (!props?.preFill?.endDate) {
    endPreFill = undefined;
  } else {
    endPreFill = getLocalDate(new Date(props?.preFill?.endDate));
  }

  const [startDate, setStartDate] = useState(startPreFill ?? "");
  const [endDate, setEndDate] = useState(endPreFill ?? "");
  const [fieldError, setFieldError] = useState(true);
  const [errMessage, setErrMessage] = useState("");
  const [oneYearRange, setOneYearRange] = useState(oneYear);
  const [tripName, setTripName] = useState(props?.preFill?.tripName ?? "");
  const [location, setLocation] = useState(props?.preFill?.location ?? "");
  const [hideSuggestions, setHideSuggestions] = useState(true);
  const [isPublic, setIsPublic] = useState(props?.preFill?.isPublic ?? false);
  const [isOpenInvite, setIsOpenInvite] = useState(props?.preFill?.isOpenInvite ?? false);
  const skipEORef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    props?.disableOrNah(fieldError);
  }, [fieldError]);

  useEffect(() => {
    const start = new Date(startDate);
    const startToModify = new Date(startDate);
    const end = new Date(endDate);
    if (startToModify instanceof Date && !isNaN(startToModify.getTime())) {
      const date = startToModify;
      date.setFullYear(date.getFullYear() + 1);
      const oneYearAway = date.toISOString().slice(0, 10);
      setOneYearRange(oneYearAway);
    }
    if (
      !tripName ||
      !location ||
      !gValues ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime()) ||
      start > end ||
      !sHtmlDateErr ||
      !eHtmlDateErr
    ) {
      setFieldError(true);
    } else {
      setFieldError(false);
    }
    if (!sHtmlDateErr || !eHtmlDateErr) {
      setErrMessage(
        "Make sure trip start is not past 10 years from today AND start of trip and end of trip does not exceed 365 days",
      );
    }
  }, [
    startDate,
    endDate,
    location,
    tripName,
    gValues,
    sHtmlDateErr,
    eHtmlDateErr,
  ]);

  useEffect(() => {
    if (props?.submit === true) {
      if (!gValues) {
        alert("ERR: Please select valid location");

        return;
      }
      const formSubmit = async () => {
        let method = "POST";
        let url: string = `${apiUrl}/add-vacation`;
        const bodyObject: {
          tripname: string;
          location: string;
          startDate: string;
          endDate: string;
          gId: string;
          gVp: GValues["vp"];
          skipEO: boolean | undefined;
          isPublic: boolean;
          isOpenInvite: boolean;
          id?: string;
        } = {
          tripname: tripName,
          location: location,
          startDate: startDate,
          endDate: endDate,
          gId: gValues.id,
          gVp: gValues.vp,
          skipEO: skipEORef.current,
          isPublic: isPublic,
          isOpenInvite: isOpenInvite,
        };
        if (props?.method === "PATCH") {
          method = "PATCH";
          bodyObject.id = props?.preFill?.id;
          url = url + "/" + bodyObject.id;
        }
        if (token) {
          const res = await fetch(url, {
            method: method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyObject),
          });
          console.log("bodyObject", bodyObject);
          if (res.status === 400) {
            setFieldError(true);
            setErrMessage("Invalid input");
          } else if (res.status === 401) {
            const resData = (await res.json()) as ApiErrorResponse;
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
              const retryReq = await fetch(url, {
                method: method,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${continueReq.token}`,
                },
                body: JSON.stringify(bodyObject),
              });
              if (!retryReq.ok) {
                alert("Trouble completing request, please try again");
              } else if (retryReq.ok) {
                if (retryReq.ok) {
                  navigate("/");
                  if (props.sendSubmissionResult) {
                    props.sendSubmissionResult(true);
                  }
                }
              }
            } else if (continueReq.err) {
              if (logout) {
                await logout();
              }
              return;
            }
          } else if (res.status === 403) {
            alert("You do not have permission to access this resource");
            navigate("/home");
          } else if (res.status === 404) {
            alert("Error: Trip not found");
            navigate("/home");
          }
          if (res.ok) {
            navigate("/");
            if (props.sendSubmissionResult) {
              props.sendSubmissionResult(true);
            }
          }
        } else {
          alert("you are not logged in - your trip will not be saved");
        }
      };
      formSubmit();
    }
  }, [props?.submit]);

  useEffect(() => {
    if (props?.method === "PATCH") {
      skipEORef.current = undefined;
    } else {
      skipEORef.current = true;
    }
  }, []);

  const startDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = new Date(e.target.value);
    const end = new Date(endDate);
    if (start > end) {
      const pushEndDate = start.toISOString().slice(0, 10);
      setEndDate(pushEndDate);
    }
    setStartDate(e.target.value);

    start.setFullYear(start.getFullYear() + 1);
    const oneYear = start.toISOString().slice(0, 10);
    setOneYearRange(oneYear);
    setSHtmlDateErr(e.target.validity.valid);
  };

  const endDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setEHtmlDateErr(e.target.validity.valid);
    console.log(e.target.validity.valid);
  };

  const divs = "flex justify-center my-4 w-full";
  const labels = "flex justify-end ml-4 mr-2 w-1/6 items-center";
  const inputs = "flex justify-start w-4/10 border-2 border-green-500";

  return (
    <>
      <div>{errMessage && <p className="text-red-500">{errMessage}</p>}</div>
      <div className="flex flex-col items-center justify-around w-full">
        <div
          //onSubmit={formSubmit}
          className="w-full flex flex-col items-center"
        >
          <div className="flex w-4/10 flex-col items-center ">
            <div className={divs}>
              <label className={labels} htmlFor="tripname">
                Trip name:{" "}
              </label>
              <input
                ref={tripNameRef}
                className={clsx(fieldError && styles.dateError, inputs)}
                type="text"
                name="tripname"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setTripName(e.target.value);
                }}
                value={tripName}
                id="tripname"
                placeholder="Honeymoon Trip"
              />
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="location">
                Destination:{" "}
              </label>
              <div className="w-4/10">
                <input
                  ref={locationInputRef}
                  className={clsx(
                    fieldError && styles.dateError,
                    inputs,
                    "w-full",
                  )}
                  type="text"
                  name="location"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setLocation(e.target.value);
                  }}
                  onFocus={() => {
                    if (clickClear) {
                      setLocation("");
                      setClickClear(false);
                      setGValues(null);
                    }
                    setHideSuggestions(false);
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (
                      e.key === "ArrowUp" ||
                      e.key === "ArrowDown" ||
                      e.key === "Enter"
                    ) {
                      e.preventDefault();
                    }
                    autocompleteRef.current?.handleKeyDown(e.key);
                  }}
                  onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      startDateRef?.current?.focus();
                    }
                  }}
                  value={location}
                  id="location"
                  placeholder="country, city, etc"
                  autoComplete="off"
                />
                {!hideSuggestions && (
                  <AutocompleteWebComponent
                    ref={autocompleteRef}
                    inputValue={location}
                    setInputVal={setLocation}
                    setHideSuggestions={setHideSuggestions}
                    storeValues={storeValues}
                    tripIdProp={props?.preFill?.id}
                    skipEO={skipEORef.current}
                  />
                )}
              </div>
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="startdate">
                Start date:{" "}
              </label>
              <input
                ref={startDateRef}
                className={clsx(fieldError && styles.dateError, inputs)}
                type="date"
                name="startdate"
                id="startdate"
                value={startDate}
                min={props?.method === "PATCH" ? undefined : today}
                max={tenYearsFromNow}
                onChange={startDateChange}
              />
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="enddate">
                End date:{" "}
              </label>
              <input
                className={clsx(fieldError && styles.dateError, inputs)}
                type="date"
                name="enddate"
                id="enddate"
                value={endDate}
                min={startDate}
                max={oneYearRange}
                onChange={endDateChange}
              />
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="isPublic">
                <QuestionMarkIcon
                  title="Public Trip"
                  description="Friends can see: Trip name, location, start date and length of trip (days)"
                />{" "}
                Public:{" "}
              </label>
              <div className="flex items-center w-4/10">
                <input
                  type="checkbox"
                  name="isPublic"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 cursor-pointer accent-green-500"
                />
              </div>
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="isOpenInvite">
                <QuestionMarkIcon
                  title="Open Invite"
                  description="This indicates to your fellow travelers they are free to contact you to tag along on the trip"
                />{" "}
                Open Invite:{" "}
              </label>
              <div className="flex items-center w-4/10">
                <input
                  type="checkbox"
                  name="isOpenInvite"
                  id="isOpenInvite"
                  checked={isOpenInvite}
                  onChange={(e) => setIsOpenInvite(e.target.checked)}
                  className="w-5 h-5 cursor-pointer accent-green-500"
                />
              </div>
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </>
  );
};

export default VacationForm;
