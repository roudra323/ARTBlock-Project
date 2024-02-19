import "./polyfills";
import "./global.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";
import { publicProvider } from "wagmi/providers/public";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, sepolia, WagmiConfig } from "wagmi";
import { polygon, optimism, arbitrum, zora, mainnet } from "wagmi/chains";
import { GlobalProvider } from "./context";

const localNode = {
  id: 43114,
  name: "Local Node",
  network: "ethereum",
  iconBackground: "#fff",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "Eth",
  },
  rpcUrls: {
    // Update this URL to your Hardhat local node URL
    default: { http: ["http://127.0.0.1:8545/"] },
  },
  testnet: false,
};

const { chains, publicClient } = configureChains(
  [sepolia, polygon, optimism, arbitrum, zora],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: "vite_starter_pack",
  projectId: import.meta.env.VITE_RAINBOWKIT_KEY,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        theme={darkTheme({
          accentColor: "#7b3fe4",
          accentColorForeground: "white",
          borderRadius: "small",
          fontStack: "system",
          overlayBlur: "small",
        })}
      >
        <GlobalProvider>
          <App />
        </GlobalProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);
