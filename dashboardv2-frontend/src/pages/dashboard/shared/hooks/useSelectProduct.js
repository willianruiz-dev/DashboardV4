import { useState} from "react";

const useSelectProduct = (products) => {
  const [selectedProduct, setSelectedPaypad] = useState(null);
  const handleProductChange = (target) => {
    setSelectedPaypad(() => {
      if(target == "Todos") return target;
      const product = products.filter((p) => p == target)[0];
      return product;
    });
  };
  return [selectedProduct, handleProductChange];
};

export default useSelectProduct;