import "../../../pages.css";
import React from "react";
import SearchingInfo from "../../../../components/SearchingInfo";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import BasicStringBuilder from "../../../../components/BasicPrimeTemplates/BasicStringBuilder";
import BasicContainerBuilder from "../../../../components/BasicPrimeTemplates/BasicContainerBuilder";

const TransactionsTable = ({transactionsTable, dateRange, showDetailed = true}) => {

  const renderList = () => {
    return (
      <div className="">
        {transactionsTable.length > 0 ? (
          <>
            {/* <TableCrud data={transactionsTable.slice((page - 1) * 10, page * 10)} isEnumarated={false} /> */}
            <DataTable selectionMode="single" value={transactionsTable} paginator rows={5}
              tableStyle={{minHeight: "30rem"}} rowsPerPageOptions={[5, 10, 25, 50]}>
              <Column body={BasicStringBuilder("ID")} header="ID" ></Column>
              <Column body={BasicStringBuilder("Trámite")} header="Trámite" ></Column>
              <Column body={BasicStringBuilder("Referencia cliente")} header="Referencia cliente" ></Column>
              <Column body={BasicStringBuilder("Documento")} header="Documento" ></Column>
              <Column body={BasicStringBuilder("Fecha")} header="Fecha" ></Column>
              <Column body={BasicStringBuilder("Total")} header="Total" ></Column>
              <Column body={BasicStringBuilder("Total sin redondear")} header="Total sin redondear" ></Column>
              <Column body={BasicStringBuilder("Ingresado")} header="Ingresado" ></Column>
              <Column body={BasicStringBuilder("Devuelto")} header="Devuelto" ></Column>
              <Column body={BasicStringBuilder("Medio de pago")} header="Medio de pago" ></Column>
              <Column header="Estado" body={BasicContainerBuilder("Estado")}></Column>
              {showDetailed?<Column header="Accion" body={BasicContainerBuilder("Accion")}></Column>: ""}
            </DataTable>
          </>
        ) : (
          dateRange? <SearchingInfo msg="Resultados no encontrados"></SearchingInfo>: <SearchingInfo msg="Seleccione los criterios de búsqueda"></SearchingInfo>
        )}
      </div>
    );
  };

  return renderList();
};

export {TransactionsTable};