import React from "react";
import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./components.css";

const ShowList = ({ _list }) => {
  const [isListVisible, setIsListVisible] = useState(false);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const toggleListVisibility = () => {
    setIsListVisible(!isListVisible);
  };

  const handleOutsideClick = (event) => {
    if (
      buttonRef.current &&
      listRef.current &&
      !buttonRef.current.contains(event.target) &&
      !listRef.current.contains(event.target)
    ) {
      setIsListVisible(false);
    }
  };

  const handleListClick = (event) => {
    event.stopPropagation();
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="d-flex flex-column align-items-center">
      <button
        className="btn btn-light p-1"
        ref={buttonRef}
        onClick={toggleListVisibility}
        style={{ fontSize: "1em" }}
      >
        <span className="me-2">Ver</span>
        <FontAwesomeIcon icon="fa-solid fa-caret-down" />
      </button>
      {isListVisible ? (
        <div className="showlist mt-2">
          <ul
            ref={listRef}
            onClick={handleListClick}
            className="px-2 mb-0 mt-1"
          >
            {_list.map((item, i) => {
              return (
                <li key={i} className="mx-2 mb-1">
                  {item}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};

ShowList.propTypes = {
  _list: PropTypes.array,
};

export default ShowList;
