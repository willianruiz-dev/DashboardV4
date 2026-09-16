import Swal from "sweetalert2";
import { handleHttpError } from "../../../errorHandling/errorHandler";
import paypadService from "../../../services/paypadService";
// import { Modal } from "bootstrap";
import loadService from "../../../services/loadService";
import tonnageService from "../../../services/tonnageService";

const usePaypadFunctionalities = (refresh, setMainView) => {
  const formComponentStatus = { showform: false, idToUpdate: null };
  
  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const confirmDelete = (_paypadName) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title:
        "¿Está seguro que desea eliminar el corresponsal " + _paypadName + " ?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updatePaypad = (paypadToUpdate) => {
    paypadService
      .update(paypadToUpdate)
      .then(() => {
        setMainView(formComponentStatus);
        refresh();
        Swal.fire({
          text: "Pay+ actualizado con éxito",
          icon: "success",
        });
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const createPaypad = (paypadToCreate) => {
    paypadService
      .create(paypadToCreate)
      .then(() => {
        setMainView(formComponentStatus);
        refresh();
        Swal.fire({
          text: "Pay+ creado con éxito",
          icon: "success",
        });
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const createPaypadConfiguration = (paypadConfigurationToCreate) => {
    paypadService
      .createConfiguration(paypadConfigurationToCreate)
      .then(() => {
        Swal.fire({
          text: "Se ha realizado la actualización correctamente",
          icon: "success",
        });
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const updatePaypadConfiguration = (paypadConfigurationToUpdate) => {
    paypadService
      .updateConfiguration(paypadConfigurationToUpdate)
      .then(() => {
        Swal.fire({
          text: "Se ha realizado la actualización correctamente",
          icon: "success",
        });
      })
      .catch(async (err) => {
        let errMsg;
        if (err.response) [, errMsg] = await handleHttpError(err.response);
        else await handleHttpError(err.response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const deletePaypad = (idToDelete) => {
    paypadService
      .deleteP(idToDelete)
      .then(() => {
        setMainView(formComponentStatus);
        refresh();
        Swal.fire({
          text: "Pay+ Eliminado",
          icon: "success",
        });
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const back = () => {
    setMainView({ ...formComponentStatus });
    refresh();
  };

  const saveStorage = async (paypadStorages) => {
    await paypadService
      .insertStorages(paypadStorages)
      .then(() => {
        // const modalObj = Modal.getInstance(
        //   document.getElementById("paypadModal")
        // );
        // modalObj.hide();
        Swal.fire({
          text: "Se ha realizado la actualización correctamente",
          icon: "success",
        });
      })
      .catch(async (err) => {
        let errMsg;
        if (err.response) [, errMsg] = await handleHttpError(err.response);
        else await handleHttpError(err.response);
        Swal.showValidationMessage(
          errMsg
        );
      });
  };

  const saveLoad = (loadObj) => {
    if (loadObj.details.length <= 0 || loadObj.totalLoaded === 0) {
      Swal.fire({
        text: "No ha proporcionado ninguna cantidad.",
        icon: "error",
      });
      return;
    }
    const confirmAction = async () => {
      await loadService.create(loadObj).catch(async (err) => {
        let errMsg;
        if (err.response) [, errMsg] = await handleHttpError(err.response);
        else await handleHttpError(err.response);
        Swal.showValidationMessage(
          errMsg
        );
      });
    };
    const finalAction = (result) => {
      if (result.isConfirmed) {
        // const modalObj = Modal.getInstance(
        //   document.getElementById("paypadModal")
        // );
        // modalObj.hide();
        Swal.fire({
          text: "Se ha realizado el cargue correctamente",
          icon: "success",
        });
      }
    };

    saveModalForm(loadObj.totalLoaded, confirmAction, finalAction);
  };

  const saveTonnage = (tonnageObj) => {
    const confirmAction = async () => {
      await tonnageService.create(tonnageObj).catch(async (err) => {
        let errMsg;
        if (err.response) [, errMsg] = await handleHttpError(err.response);
        else await handleHttpError(err.response);
        Swal.showValidationMessage(
          errMsg
        );
      });
    };
    const finalAction = (result) => {
      if (result.isConfirmed) {
        // const modalObj = Modal.getInstance(
        //   document.getElementById("paypadModal")
        // );
        // modalObj.hide();
        Swal.fire({
          text: "Se ha realizado el arqueo correctamente",
          icon: "success",
        });
      }
    };
    saveModalForm(tonnageObj.total, confirmAction, finalAction);
  };

  const saveModalForm = async (total, preConfirmAction, finalAction) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    swalWithBootstrapButtons
      .fire({
        text: `Está seguro que desea hacer el movimiento por total de ${moneyFormater.format(
          total
        )}. Esta acción es irreversible.`,
        icon: "warning",
        confirmButtonText: "Si, continuar",
        showCancelButton: true,
        showLoaderOnConfirm: true,
        preConfirm: preConfirmAction,
        allowOutsideClick: () => !Swal.isLoading(),
      })
      .then(finalAction)
      .catch(async (err) => {
        await handleHttpError(err);
      });
  };

  return {
    saveTonnage, 
    saveLoad, 
    saveStorage, 
    back, 
    deletePaypad, 
    updatePaypad, 
    createPaypad, 
    confirmDelete,
    createPaypadConfiguration,
    updatePaypadConfiguration
    
  };
};

export {
  usePaypadFunctionalities
};