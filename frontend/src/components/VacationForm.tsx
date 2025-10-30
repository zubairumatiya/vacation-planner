import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/AddVacationForm.module.css";
import { AuthContext } from "../context/AuthContext.tsx";
import clsx from "clsx";
import { AutocompleteWebComponent } from "../components/map-components/autocomplete-webcomponent.tsx";
const apiUrl = import.meta.env.VITE_API_URL;

type Props = {
  preFill?: {
    trip_name: string;
    location: string;
    start_date: string;
    end_date: string;
    id: string;
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

  const today = new Date().toISOString().slice(0, 10);
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const oneYear = date.toISOString().slice(0, 10);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [gValues, setGValues] = useState<GValues | null>(null);
  const [clickClear, setClickClear] = useState<boolean>(true);

  const navigate = useNavigate();

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
    const getGValues = async () => {
      try {
        const result = await fetch(
          `${apiUrl}/add-vacation/${props?.preFill?.id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (result.ok) {
          const data = await result.json();
          setGValues({
            id: data.gId,
            location: props?.preFill?.location ?? data.gLocation,
            vp: data.gVp,
          });
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
  if (!props?.preFill?.start_date) {
    startPreFill = undefined;
  } else {
    startPreFill = getLocalDate(new Date(props?.preFill?.start_date));
  }

  let endPreFill;
  if (!props?.preFill?.end_date) {
    endPreFill = undefined;
  } else {
    endPreFill = getLocalDate(new Date(props?.preFill?.end_date));
  }

  const [startDate, setStartDate] = useState(startPreFill ?? "");
  const [endDate, setEndDate] = useState(endPreFill ?? "");
  const [fieldError, setFieldError] = useState(true);
  const [errMessage, setErrMessage] = useState("");
  const [oneYearRange, setOneYearRange] = useState(oneYear);
  const [tripName, setTripName] = useState(props?.preFill?.trip_name ?? "");
  const [location, setLocation] = useState(props?.preFill?.location ?? "");
  const [hideSuggestions, setHideSuggestions] = useState(true);

  useEffect(() => {
    props?.disableOrNah(fieldError);
  }, [fieldError]);

  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      !tripName ||
      !location ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime()) ||
      start > end ||
      !gValues
    ) {
      setFieldError(true);
    } else {
      setFieldError(false);
    }
  }, [startDate, endDate, location, tripName, gValues]);

  useEffect(() => {
    if (!gValues) {
      alert("ERR: Please select valid location");
      return;
    }
    if (props?.submit === true) {
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
          id?: string;
        } = {
          tripname: tripName,
          location: location,
          startDate: startDate,
          endDate: endDate,
          gId: gValues.id,
          gVp: gValues.vp,
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
          const data = await res.json();
          if (res.status === 403) {
            setFieldError(true);
            setErrMessage(data.message);
          }
          if (res.status === 401 && data.error === "TokenExpired") {
            auth?.logout();
            navigate("/redirecting", {
              state: { message: "Token error, redirecting to login" },
            });
          }
          if (res.ok) {
            navigate("/");
            if (props.sendSubmissionResult) {
              props.sendSubmissionResult(true);
            }
          }
          console.log(data);
        } else {
          alert("you are not logged in - your trip will not be saved");
        }
      };

      formSubmit();
    }
  }, [props?.submit]);

  const startDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
    const start = new Date(e.target.value);
    const end = new Date(endDate);
    console.log("start:", start, "end", end);
    if (start > end) {
      console.log("evaluating date");
      const pushEndDate = start.toISOString().slice(0, 10);
      setEndDate(pushEndDate);
    }
    setStartDate(e.target.value);

    start.setFullYear(start.getFullYear() + 1);
    const oneYear = start.toISOString().slice(0, 10);
    setOneYearRange(oneYear);
  };

  const endDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const divs = "flex justify-center my-4 w-full";
  const labels = "flex justify-end ml-4 mr-2 w-1/6";
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
                    "w-full"
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
                  //onBlur={() => setHideSuggestions(true)}
                  value={location}
                  id="location"
                  placeholder="country, city, etc"
                  autoComplete="off"
                />
                {!hideSuggestions && (
                  <AutocompleteWebComponent
                    inputValue={location}
                    setInputVal={setLocation}
                    setHideSuggestions={setHideSuggestions}
                    storeValues={storeValues}
                  />
                )}
              </div>
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="startdate">
                Start date:{" "}
              </label>
              <input
                className={clsx(fieldError && styles.dateError, inputs)}
                type="date"
                name="startdate"
                id="startdate"
                value={startDate}
                min={props?.method === "PATCH" ? undefined : today}
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
          </div>
          <div></div>
        </div>
      </div>
    </>
  );
};

export default VacationForm;
