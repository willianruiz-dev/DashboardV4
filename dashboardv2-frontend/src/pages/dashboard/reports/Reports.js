import "../../pages.css";
import {React, useEffect, useState} from "react";
import withAuthorization from "../../withAuthorization";
import SelectPayPad from "../shared/SelectPayPad";
import useFormDate from "../shared/hooks/useFormDate";
import FormDate from "../shared/FormDate";
import useSelectPayPad from "../shared/hooks/useSelectPayPad";
import useTransaction from "../shared/hooks/useTransaction";
import { TransactionsTable } from "../transactions/components/TransactionTable";
import SelectProduct from "../shared/SelectProduct";
import useSelectProduct from "../shared/hooks/useSelectProduct";
import {TitlePage} from "../../../components/TitlePage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


const Reports = () => {
  const {paypads, selectedPaypad, handleChangePaypad} = useSelectPayPad(true);
  const {dateRange, handleSubmitDate, dateTimeFrom, dateTimeTo, setDateTimeFrom, setDateTimeTo} = useFormDate();
  const { transactionsTable, refresh, initialTransactions, setTransactions} = useTransaction(dateRange, selectedPaypad);
  const [products, setProducts] = useState([]);
  const [selectedProduct, handleProductChange] = useSelectProduct(products);

  useEffect(() => {
    refresh();
  }, []);


  useEffect(() => {
    if (dateRange === null) return;
    refresh();
  }, [dateRange]);

  useEffect(()=>{
    let products = initialTransactions.map(tr => tr.product);
    if(products.length > 0)products.push("Todos");
    setProducts([... new Set(products)]);
  }, [initialTransactions]);

  useEffect(()=>{
    if(selectedProduct == "Todos"){
      setTransactions([...initialTransactions]);
      return;
    }
    setTransactions([...initialTransactions.filter(tr => tr.product == selectedProduct)]);
  }, [selectedProduct]);

  return (
    <div className="p-4 w-100 h-100">
      <TitlePage title={"reportes"} icon={"fa-solid fa-money-check-dollar"}></TitlePage>
      <div className="container-fluid mb-6 justify-content-start bg-dark rounded-4"
        style={{marginBottom: "3rem", paddingLeft: "5rem", paddingRight: "5rem", paddingTop: "2rem", paddingBottom: "2rem"}}>
        <b>Parametros de busqueda</b>
        <div className="row">
          <div className="col-6">
            <SelectPayPad
              paypads={paypads ? paypads : []}
              paypadSelected={selectedPaypad}
              handleChangePaypad={handleChangePaypad}
              showAllPayPads={true}
            />
          </div>
          <div className="col-6" style={{borderLeft: "solid", alignSelf: "center"}}>
            {/* <FormDate handleSubmitDate={handleSubmitDate} /> */}
            <FormDate handleSubmitDate={handleSubmitDate}
              dateFrom={dateTimeFrom}
              dateTo={dateTimeTo}
              setDateFrom={setDateTimeFrom}
              setDateTo={setDateTimeTo}
            />
          </div>
        </div>
        <div className="row">
          <div className="col-12 p-2" style={{textAlign: "end"}}>
            <button className="btn btn-outline-success" onClick={handleSubmitDate}>
              <FontAwesomeIcon icon={"fa-solid fa-search"} className="ms-2" style={{marginRight: "1rem"}}/>
              Consultar
            </button>
          </div> 
        </div>
        <b>Reportar por:</b>
        <div className="row">
          <div className="col-6">
            <SelectProduct
              products={products}
              handleProductChange={handleProductChange}
              selectedProduct={selectedProduct}></SelectProduct>
          </div>
        </div>
      </div>
      <div className="container-fluid pt-2 bg-dark rounded-4  overflow-auto">
        <TransactionsTable transactionsTable = {transactionsTable} dateRange = {dateRange}  showDetailed = {false}></TransactionsTable>
      </div>
    </div>
  );
};

export default withAuthorization(["/Reports"], Reports);