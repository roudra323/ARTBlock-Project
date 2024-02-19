import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useGlobalContext } from "./context";
import { useEffect, useState } from "react";
import getWeb3Storage from "./libs/web3.storage";
import { uuid } from "uuidv4";

function App() {
  const {
    address,
    isConnected,
    isDisconnected,
    sumState,
    divState,
    tx,
    setTx,
    error,
    isLoading,
    isSuccess,
  } = useGlobalContext();

  const sumContract = sumState.contract;
  const divContract = divState.contract;

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageURI, setImageURI] = useState(null);

  const web3Storage = getWeb3Storage();

  console.log("sumContract from app.jsx", sumState);
  console.log("divContract from app.jsx", divState);

  const sumAns = async () => {
    const tx = await sumContract.summation();
    setTx(tx);
    console.log("tx from app.jsx", tx);
  };

  const divAns = async () => {
    const tx = await divContract.division();
    setTx(tx);
  };

  const handleImageUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      const ext = file.name.split(".").pop();
      const fileName = `${uuid()}.${ext}`;
      const newFile = new File([file], fileName, {
        type: file.type,
      });

      // Assuming you have a function named web3Storage.put for uploading
      const CID = await web3Storage.put([newFile], { name: fileName });
      const imageURI = `https://${CID}.ipfs.dweb.link/${fileName}`;

      // Set the uploaded image URI in the state
      setImageURI(imageURI);
      console.log("imageURI", imageURI);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: 12,
        }}
      >
        <ConnectButton />
      </div>

      <h1>{address}</h1>
      <h1>{isConnected ? "Connected" : "Not Connected"}</h1>
      <h1>{isDisconnected ? "Disconnected" : "Not Disconnected"}</h1>
      <button onClick={sumAns}>Sum</button>
      <button onClick={divAns}>Div</button>

      {/* Add the image upload section */}
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      {imageURI && <img src={imageURI} alt="Uploaded" />}
      {imageURI && <h1>{imageURI}</h1>}
      <h1 className=" bg-red-600">Hello World</h1>
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Remember me</span>
          <input type="checkbox" checked="checked" className="checkbox" />
        </label>
      </div>
    </div>
  );
}

export default App;
