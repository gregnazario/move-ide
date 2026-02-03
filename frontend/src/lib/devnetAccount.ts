const STORAGE_KEY = "move-ide-devnet-account";

export type DevnetAccountData = {
    address: string;
    publicKey: string;
    privateKey: string;
    createdAt: string;
};

export const loadDevnetAccount = (): DevnetAccountData | null => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as DevnetAccountData;
    } catch {
        return null;
    }
};

export const saveDevnetAccount = (data: DevnetAccountData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const clearDevnetAccount = () => {
    localStorage.removeItem(STORAGE_KEY);
};

export const createDevnetAccount = async (): Promise<DevnetAccountData> => {
    const { Account } = await import("@aptos-labs/ts-sdk");
    const account = Account.generate();
    const data: DevnetAccountData = {
        address: account.accountAddress.toString(),
        publicKey: account.publicKey.toString(),
        privateKey: account.privateKey.toString(),
        createdAt: new Date().toISOString(),
    };
    saveDevnetAccount(data);
    return data;
};

export const accountFromStored = async (data: DevnetAccountData) => {
    const { Account, Ed25519PrivateKey } = await import("@aptos-labs/ts-sdk");
    return Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(data.privateKey),
    });
};

export const getDevnetClient = async () => {
    const { Aptos, AptosConfig, Network } = await import("@aptos-labs/ts-sdk");
    return new Aptos(new AptosConfig({ network: Network.DEVNET }));
};

export const exportDevnetAccount = (data: DevnetAccountData) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "devnet-account.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export const fundDevnetAccount = async (address: string) => {
    const faucetUrl = new URL("https://faucet.devnet.aptoslabs.com/mint");
    faucetUrl.searchParams.set("address", address);
    faucetUrl.searchParams.set("amount", "100000000");
    const response = await fetch(faucetUrl.toString(), { method: "POST" });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to fund devnet account");
    }
    return response.json();
};
