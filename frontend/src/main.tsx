import { Network } from "@aptos-labs/ts-sdk";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");
if (root) {
    createRoot(root).render(
        <StrictMode>
            <AptosWalletAdapterProvider
                autoConnect
                dappConfig={{ network: Network.DEVNET }}
            >
                <App />
            </AptosWalletAdapterProvider>
        </StrictMode>,
    );
} else {
    throw new Error("Root element not found");
}
