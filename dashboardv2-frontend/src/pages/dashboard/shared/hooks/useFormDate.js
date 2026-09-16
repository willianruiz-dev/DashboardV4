import { useState} from "react";
const defDateFrom = new Date();
defDateFrom.setHours(0,0,0,0);

const defDateTo = new Date();
defDateTo.setHours(23,59,59,999);

const useFormDate = () => {
  const [dateRange, setDateRange] = useState(null);
  const [dateTimeTo, setDateTimeTo] = useState(defDateTo);
  const [dateTimeFrom, setDateTimeFrom] = useState(defDateFrom);


  const handleSubmitDate = (selectedPaypad) => {
    const paypadNameElem = document.getElementById("paypadSelect");
    const fromDateElem = document.getElementById("fromDate");
    const toDateElem = document.getElementById("toDate");
    

    if(fromDateElem.className.includes("p-invalid")) {fromDateElem.className = fromDateElem.className.replace("p-invalid", "");}
    if(toDateElem.className.includes("p-invalid")) {toDateElem.className = toDateElem.className.replace("p-invalid", "");}
    if(paypadNameElem.className.includes("p-invalid")) {paypadNameElem.className = paypadNameElem.className.replace("p-invalid", "");}

    let isFormCorrect = true;
    if (["", undefined, null].includes(dateTimeFrom) ){
      if(!fromDateElem.className.includes("p-invalid")) fromDateElem.className += " p-invalid";
      isFormCorrect = false;
    }

    if (["", undefined, null].includes(dateTimeTo)) {
      if(!toDateElem.className.includes("p-invalid")) toDateElem.className += " p-invalid";
      isFormCorrect = false;
    }

    if (["", undefined, null].includes(selectedPaypad)) {
      if(!paypadNameElem.className.includes("p-invalid")) paypadNameElem.className += " p-invalid";
      isFormCorrect = false;
    }

    if (!isFormCorrect) return;

    // setDateRange({ from: fromDateElem.value, to: toDateElem.value });
    setDateRange({ from: dateTimeFrom, to: dateTimeTo });
  };
  return {dateRange, handleSubmitDate, dateTimeFrom, dateTimeTo, setDateTimeFrom, setDateTimeTo};
};

export default useFormDate;