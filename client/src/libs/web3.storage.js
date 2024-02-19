import { Web3Storage } from "web3.storage";

const WEB3_STORAGE_TOKEN = import.meta.env.VITE_WEB3STORAGE_KEY;

function getAccessToken() {
  if (!WEB3_STORAGE_TOKEN) throw new Error("WEB3_STORAGE_TOKEN is not defined");
  return WEB3_STORAGE_TOKEN;
}

const getWeb3Storage = () => new Web3Storage({ token: getAccessToken() });

export default getWeb3Storage;
