import { React, useState } from "react";
import IconBtn from "../../../components/UI/Edit_DeleteBtn/IconBtn";
import { useSelector } from "react-redux";
import PayPadLoadForm from "../components/PayPadLoadForm/PayPadLoadForm";
import PayPadTonnageForm from "../components/PayPadTonnageForm/PayPadTonnageForm";
import PayPadStorageForm from "../components/PayPadStorageForm/PayPadStorageForm";
import PayPadBalanceView from "../components/PayPadBalanceView";
import EditBtn from "../../../components/UI/Edit_DeleteBtn/EditBtn";
import DeleteBtn from "../../../components/UI/Edit_DeleteBtn/DeleteBtn";
import { PayPadConfigurationForm } from "../components/PayPadConfigurationForm/PayPadConfigurationForm";

const useModelFormat = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const [paypadInfoFormated, setPaypadInfoFormated] = useState([]);
  const [modalElement, setModalElement] = useState(null);

  
  const buildModel = (newPaypads, offices, functionalities, setMainView) => {
    if (!newPaypads) return;
    let modelTranslated = [];
    newPaypads.forEach((item) => {
      const itemOffice = offices.filter((o) => o.id === item.idOffice)[0];
      const itemTranslated = {
        id: item.id,
        Nombre: item.username,
        Sucursal: itemOffice,
        MenuTemplate: (
          <div className="container">
            { permissions.filter((p) => p.name === "ReadTonnagesAndLoads").length > 0 ?
              <>
                <IconBtn
                  clickFunc={() => {
                    const itemCopy = { ...item };
                    setModalElement(
                      <PayPadStorageForm
                        paypad={itemCopy}
                        saveClickFunc={functionalities.saveStorage}
                      />
                    );
                  }}
                  icon="fa-solid fa-dollar-sign"
                  tooltipText="Configurar denominaciones"
                />
                <IconBtn
                  clickFunc={() => {
                    const itemCopy = { ...item };
                    setModalElement(
                      <PayPadTonnageForm
                        paypad={itemCopy}
                        saveClickFunc={functionalities.saveTonnage}
                      />
                    );
                  }}
                  icon="fa-solid fa-scale-unbalanced"
                  tooltipText="Realizar Arqueo"
                />
                <IconBtn
                  clickFunc={() => {
                    const itemCopy = { ...item };
                    setModalElement(
                      <PayPadLoadForm paypad={itemCopy} saveClickFunc={functionalities.saveLoad} />
                    );
                  }}
                  icon="fa-solid fa-circle-dollar-to-slot"
                  tooltipText="Realizar cargue"
                />
                <IconBtn
                  clickFunc={() => {
                    const itemCopy = { ...item };
                    setModalElement(<PayPadBalanceView paypad={itemCopy} />);
                  }}
                  icon="fa-solid fa-glasses"
                  tooltipText="Ver Arqueos y Cargues"
                />
                
              </>: ""
            }
            <>
              { permissions.filter((p) => p.name === "WritePayPads").length > 0 ? 
                <>
                  <IconBtn
                    clickFunc={() => {
                      const itemCopy = { ...item };
                      setModalElement(
                        <PayPadConfigurationForm paypad={itemCopy}
                          functionalities={{create: functionalities.createPaypadConfiguration, update: functionalities.updatePaypadConfiguration}}
                        />
                      );
                    }}
                    icon="fa-solid fa-gear"
                    tooltipText="Configurar Paypad"
                  />
                  <EditBtn
                    clickFunc={() => {
                      setMainView({ showform: true, idToUpdate: item.id });
                    }}
                  />
                </>
                :""
              }

              { permissions.filter ((p) => p.name === "DelPayPads").length > 0 ?
                <DeleteBtn
                  clickFunc={() => {
                    functionalities.confirmDelete(item.username).then((result) => {
                      if (result.isConfirmed) functionalities.deletePaypad(item.id);
                    });
                  }}
                /> :""
              }
            </>
          </div>
        ),
      };
      modelTranslated = modelTranslated.concat(itemTranslated);
    });
    setPaypadInfoFormated([...modelTranslated]);
  };
  return {paypadInfoFormated, modalElement, buildModel, permissions};
};

export default useModelFormat;