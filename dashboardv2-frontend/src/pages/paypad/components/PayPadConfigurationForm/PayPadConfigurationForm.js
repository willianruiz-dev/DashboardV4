import React, {  useEffect, useState } from "react";
import PropTypes from "prop-types";
import {useForm, Controller} from "react-hook-form";
import {InputText} from "primereact/inputtext";
import {classNames} from "primereact/utils";
import { ToggleButton } from "primereact/togglebutton";
import { TitleVerticalAlignPage } from "../../../../components/TitlePage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePayPadConfiguration } from "./usePayPadConfiguration";

const EXTRA_DATA_KEY = "extraDataKey";
const EXTRA_DATA_VALUE = "extraDataValue";
const DEFAULT_FORM_VALUE = {
  debug: false, 
  validatePeripherals: false, 
  arduinoPort: "", 
  dispenserDenominations: "", 
  dispenserPort: "", 
  meiPort: "", 
  printerPort: "", 
  scannerPort: "",
};

const createPayPadConfigurationDto = (formData) => {

  const keys = Object.keys(formData);
  const extraDataKeys = keys.filter(key => key.startsWith(EXTRA_DATA_KEY));
  const extraData = [];

  extraDataKeys.forEach(key => {
    const number = key.replace(EXTRA_DATA_KEY, "");
    const valueKey = `${EXTRA_DATA_VALUE}${number}`;
    extraData.push({ key: formData[key], value: formData[valueKey] });
  });
  return (
    {
      idPaypad: formData.paypadId,
      debug: formData.debug?? false,
      validatePeripherals: formData.validatePeripherals?? false,
      scannerPort: formData.scannerPort,
      arduinoPort: formData.arduinoPort,
      dispenserPort: formData.dispenserPort,
      meiPort: formData.meiPort,
      printerPort: formData.printerPort,
      dispenserDenominations: formData.dispenserDenominations,
      extraDataJson: extraData
    }
  );
};
const createDataExtraObject = (extraDataArray) => {
  const result = {};

  extraDataArray.forEach((item, index) => {
    const key = `${EXTRA_DATA_KEY}${index + 1}`;
    const valueKey = `${EXTRA_DATA_VALUE}${index + 1}`;
    result[key] = item.key;
    result[valueKey] = item.value;
  });

  return result;
};

const PayPadConfigurationForm = ({paypad, functionalities}) => {

  const [extraData, setExtraData] = useState([]);
  const {handleSubmit, control, formState:{errors}, reset } = useForm({DEFAULT_FORM_VALUE});
  const {paypadConfiguration, refresh} = usePayPadConfiguration(paypad);


  useEffect(()=>{
    async function asyncFetch() {
      await refresh();
    }
    asyncFetch();
  }, []);

  useEffect(()=>{
    if(paypadConfiguration){
      reset ({
        ...createDataExtraObject(paypadConfiguration.extraDataJson),
        debug: paypadConfiguration.debug, 
        validatePeripherals: paypadConfiguration.validatePeripherals, 
        arduinoPort: paypadConfiguration.arduinoPort, 
        dispenserDenominations: paypadConfiguration.dispenserDenominations, 
        dispenserPort: paypadConfiguration.dispenserPort, 
        meiPort: paypadConfiguration.meiPort, 
        printerPort: paypadConfiguration.printerPort, 
        scannerPort: paypadConfiguration.scannerPort
      });
      setExtraData(paypadConfiguration.extraDataJson.map((el, index) => [EXTRA_DATA_KEY + (index + 1).toString(), EXTRA_DATA_VALUE + (index + 1).toString()]));
    }
    
  }, [paypadConfiguration]);

  const onSubmit = (data) => {
    const body = createPayPadConfigurationDto({...data, paypadId: paypad.id});
    if(!paypadConfiguration) functionalities.create(body);
    else functionalities.update({...body, id: paypadConfiguration.id, idUserCreated: paypadConfiguration.idUserCreated});
  };
  const getFormErrorMessage=(name) =>{
    return errors[name] && <small className="p-error">{errors[name].message}</small>;
  };

  return (
    <div>
      <div>
        <TitleVerticalAlignPage title={"Configuración Paypad"} icon={"fa-solid fa-gear"}></TitleVerticalAlignPage>
        <div className="container bg-dark rounded-4" style={{padding: "2rem"}}>
          <form onSubmit={handleSubmit(onSubmit)} className="p-fluid">
            <div className="row">
              <div className="col">
                <div className="field">
                  <span className="p-float-label">
                    <Controller name="scannerPort" control={control} rules={{required:"Puerto del scanner es necesario"}} render={({field, fieldState})=>(
                      <InputText id={field.name} {...field} className={classNames({ "p-invalid": fieldState.invalid })}/>
                    )}/>
                    <label htmlFor="scannerPort" className={classNames({ "p-error": errors.scannerPort })}>Puerto del Scanner*</label>
                  </span>
                  {getFormErrorMessage("scannerPort")}
                </div>
              </div>
              <div className="col">
                <div className="field">
                  <span className="p-float-label">
                    <Controller name="arduinoPort" control={control} rules={{required:"Puerto del Arduino es necesario"}} render={({field, fieldState})=>(
                      <InputText id={field.name} {...field} className={classNames({ "p-invalid": fieldState.invalid })} />
                    )}/>
                    <label htmlFor="arduinoPort" className={classNames({ "p-error": errors.arduinoPort })}>Puerto del Arduino*</label>
                  </span>
                  {getFormErrorMessage("arduinoPort")}
                </div>
              </div>
              <div className="col">
                <div className="field">
                  <span className="p-float-label">
                    <Controller name="meiPort" control={control} rules={{required:"Puerto del MEI es necesario"}} render={({field, fieldState})=>(
                      <InputText id={field.name} {...field} className={classNames({ "p-invalid": fieldState.invalid })} />
                    )}/>
                    <label htmlFor="meiPort" className={classNames({ "p-error": errors.meiPort })}>Puerto del MEI*</label>
                  </span>
                  {getFormErrorMessage("meiPort")}
                </div>
              </div>
            </div>
            <div className="row" style={{paddingTop: "2rem"}}>
              <div className="col">
                <div className="field">
                  <span className="p-float-label">
                    <Controller name="dispenserPort" control={control} rules={{required:"Puerto del dispensador es necesario"}} render={({field, fieldState})=>(
                      <InputText id={field.name} {...field} className={classNames({ "p-invalid": fieldState.invalid })}/>
                    )}/>
                    <label htmlFor="dispenserPort" className={classNames({ "p-error": errors.dispenserPort })}>Puerto del dispensador*</label>
                  </span>
                  {getFormErrorMessage("dispenserPort")}
                </div>
              </div>
              <div className="col">
                <div className="field">
                  <span className="p-float-label">
                    <Controller name="printerPort" control={control} rules={{required:"Puerto de la impresora es necesario"}} render={({field, fieldState})=>(
                      <InputText id={field.name} {...field} className={classNames({ "p-invalid": fieldState.invalid })} />
                    )}/>
                    <label htmlFor="printerPort" className={classNames({ "p-error": errors.printerPort })}>Puerto de la impresora*</label>
                  </span>
                  {getFormErrorMessage("printerPort")}
                </div>
              </div>
            </div>
            <div className="row" style={{paddingTop: "2rem"}}>
              <div className="col">
                <div className="field">
                  <span className="p-float-label">
                    <Controller name="dispenserDenominations" control={control} rules={{required:"Ingrese las denominaciones del dispensador"}} render={({field, fieldState})=>(
                      <InputText id={field.name} {...field} className={classNames({ "p-invalid": fieldState.invalid })}/>
                    )}/>
                    <label htmlFor="dispenserDenominations" className={classNames({ "p-error": errors.dispenserDenominations })}>Denominaciones del Dispensador*</label>
                  </span>
                  {getFormErrorMessage("dispenserDenominations")}
                </div>
              </div>
            </div>
            <div className="row" style={{paddingTop: "2rem"}}>
              <span style={{marginBottom: "1rem"}}>Recuerde configurar las banderas de forma adecuada para producción:</span>
              <div className="d-flex justify-content-center">
                <div className="field">
                  <label htmlFor="Debug">Debug*</label>
                  <Controller name="debug" control={control} render={({field, })=>(
                    <ToggleButton id={field.name} onChange={(e) => field.onChange(e.value)} checked={field.value}
                      onLabel="Debugging" offLabel="No Debugging"
                      className={classNames({"btn btn-outline-success":!field.value, "btn btn-outline-danger": field.value})}
                    />
                  )}/>
                </div>
                <div className="field" style={{marginLeft: "1rem"}}>
                  <label htmlFor="validatePeripherals">Validar periféricos*</label>
                  <Controller name="validatePeripherals" control={control} render={({field, })=>(
                    <ToggleButton id={field.name} onChange={(e) => field.onChange(e.value)} checked={field.value}
                      onLabel="Sí" offLabel="No"
                      className={classNames({"btn btn-outline-success":field.value, "btn btn-outline-danger": !field.value})}
                    />
                  )}/>
                </div>
              </div>
            </div>
            <div className="container" style={{paddingTop: "3rem"}}>
              <div className="d-flex justify-content-center align-items-center">
                <span style={{fontSize: "1.5rem"}}>Extra Data:</span>
                <button className="btn btn-outline-success"
                  type="button"
                  style={{marginLeft: "10px"}}
                  onClick={()=>setExtraData((ps) => [...ps, [EXTRA_DATA_KEY + (ps.length + 1).toString(), EXTRA_DATA_VALUE + (ps.length + 1).toString()]])}>
                  <FontAwesomeIcon icon={"fa-solid fa-plus"} style={{height: "1rem", marginLeft: "5px", marginRight: "2px"}}/>
                  Agregar
                </button>
              </div>
              <div style={{maxHeight: "20rem", overflowY: "auto"}}>
                {extraData.length > 0 ? <>
                  {extraData.map((element) => {
                    return (
                      <div key={element[0]}>
                        <div className="d-flex justify-content-center align-items-center" style={{marginTop: "1rem"}} >
                          <Controller name={element[0]} control={control} render={({field, })=>(
                            <InputText id={field.name} {...field}/>
                          )}/>
                          <div className="text-center p-2" style={{ background: "#678" }}>
                            :
                          </div>
                          <Controller name={element[1]} control={control} render={({field, })=>(
                            <InputText id={field.name} {...field}/>
                          )}/>
                          <button className="btn btn-outline-danger"
                            type="button"
                            style={{margin: "8px"}}
                            onClick={()=>setExtraData((ps) => ps.filter(el => {return el[0] !== element[0];}))}>
                            <FontAwesomeIcon icon={"fa-solid fa-minus"} style={{height: "1rem"}}/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
                  :
                  <span>No existen datos extras a configurar</span>}
              </div>
            </div>
            <br/>
            <div className="row">
              <button type="submit" className="btn btn-outline-success">
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

PayPadConfigurationForm.propTypes = {
  paypad: PropTypes.object,
  functionalities: PropTypes.object,
};
export {PayPadConfigurationForm};