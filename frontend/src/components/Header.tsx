import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
    ChevronDown,
    Download,
    FlaskConical,
    Monitor,
    Moon,
    Play,
    Settings,
    Share2,
    Sun,
    Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWebSocket } from "../hooks/useWebSocket";
import {
    type DevnetAccountData,
    accountFromStored,
    createDevnetAccount,
    exportDevnetAccount,
    fundDevnetAccount,
    getDevnetClient,
    loadDevnetAccount,
} from "../lib/devnetAccount";
import { useUiStore, useWorkspaceStore } from "../store";

export function Header() {
    const { isExecuting, selectedFunction, wsStatus } = useWorkspaceStore();
    const { themeMode, setThemeMode } = useUiStore();
    const { execute, executeWithResult } = useWebSocket();
    const {
        connected,
        account,
        wallets,
        connect,
        disconnect,
        signAndSubmitTransaction,
        network,
    } = useWallet();
    const [showRunMenu, setShowRunMenu] = useState(false);
    const [showWalletMenu, setShowWalletMenu] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const settingsMenuRef = useRef<HTMLDivElement | null>(null);
    const [devnetAccount, setDevnetAccount] =
        useState<DevnetAccountData | null>(null);

    useEffect(() => {
        setDevnetAccount(loadDevnetAccount());
    }, []);

    useEffect(() => {
        if (!showSettingsMenu) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                settingsMenuRef.current &&
                !settingsMenuRef.current.contains(event.target as Node)
            ) {
                setShowSettingsMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showSettingsMenu]);

    const walletList = useMemo(
        () => wallets.filter((wallet) => wallet.readyState !== "NotDetected"),
        [wallets],
    );

    const handleRun = async () => {
        if (!selectedFunction) {
            toast.error("Please select an entry function");
            return;
        }
        await execute("run");
    };

    const handleTest = async () => {
        await execute("test");
    };

    const handleShare = async () => {
        const { files, namedAddresses } = useWorkspaceStore.getState();

        const filesArray = Array.from(files.values()).map((f) => ({
            path: f.path,
            content: f.content,
        }));

        try {
            const response = await fetch("/api/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    files: filesArray,
                    named_addresses: namedAddresses,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to create share link");
            }

            const data = await response.json();

            // Update URL
            window.history.pushState({}, "", `?id=${data.id}`);
            useWorkspaceStore.getState().setGistId(data.id);

            // Copy to clipboard
            await navigator.clipboard.writeText(data.url);
            toast.success("Link copied to clipboard!");
        } catch (err) {
            toast.error(`Failed to share: ${(err as Error).message}`);
        }
    };

    const handleExport = async () => {
        const { files } = useWorkspaceStore.getState();
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();

        for (const file of files.values()) {
            zip.file(file.path, file.content);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "move-playground.zip";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success("Downloaded ZIP");
    };

    const handleCreateDevnetAccount = async () => {
        const data = await createDevnetAccount();
        setDevnetAccount(data);
        toast.success("Devnet account created (local-only)");
    };

    const handleExportDevnetAccount = () => {
        if (!devnetAccount) {
            toast.error("No devnet account to export");
            return;
        }
        exportDevnetAccount(devnetAccount);
    };

    const base64ToBytes = (data: string) => {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    };

    const hexToBytes = (data: string) => {
        const hex = data.replace(/^0x/, "");
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
        }
        return bytes;
    };

    const maybeDecodeArgument = (arg: unknown) => {
        if (typeof arg !== "string") return arg;
        if (/^0x[0-9a-fA-F]+$/.test(arg)) {
            return hexToBytes(arg);
        }
        if (/^[A-Za-z0-9+/]+={0,2}$/.test(arg) && arg.length % 4 === 0) {
            try {
                return base64ToBytes(arg);
            } catch {
                return arg;
            }
        }
        return arg;
    };

    type PublishArgument =
        | string
        | number
        | boolean
        | bigint
        | Uint8Array
        | string[]
        | number[]
        | boolean[]
        | Uint8Array[];

    const buildPublishPayload = async () => {
        const result = await executeWithResult("build_publish_payload");
        if (!result.publish_payload) {
            throw new Error("No publish payload returned");
        }
        return result.publish_payload;
    };

    const handlePublish = async () => {
        try {
            const publishPayload = await buildPublishPayload();
            const normalizedArguments = publishPayload.arguments.map(
                maybeDecodeArgument,
            ) as PublishArgument[];

            if (connected) {
                const response = await signAndSubmitTransaction({
                    data: {
                        function:
                            publishPayload.function as `${string}::${string}::${string}`,
                        typeArguments: publishPayload.type_arguments,
                        functionArguments: normalizedArguments,
                    },
                });
                toast.success(`Publish submitted: ${response.hash}`);
                return;
            }

            if (!devnetAccount) {
                toast.error("Connect a wallet or create a devnet account");
                return;
            }

            const signer = await accountFromStored(devnetAccount);
            const aptosDevnetClient = await getDevnetClient();
            const transaction =
                await aptosDevnetClient.transaction.build.simple({
                    sender: signer.accountAddress,
                    data: {
                        function:
                            publishPayload.function as `${string}::${string}::${string}`,
                        typeArguments: publishPayload.type_arguments,
                        functionArguments: normalizedArguments,
                    },
                });
            const pending = await aptosDevnetClient.signAndSubmitTransaction({
                signer,
                transaction,
            });
            toast.success(`Publish submitted: ${pending.hash}`);
        } catch (err) {
            toast.error(`Publish failed: ${(err as Error).message}`);
        }
    };

    const handleRunOnChain = async () => {
        if (!selectedFunction) {
            toast.error("Please select an entry function");
            return;
        }
        try {
            if (connected) {
                const response = await signAndSubmitTransaction({
                    data: {
                        function:
                            selectedFunction as `${string}::${string}::${string}`,
                        functionArguments: [],
                    },
                });
                toast.success(`Transaction submitted: ${response.hash}`);
                return;
            }

            if (!devnetAccount) {
                toast.error("Connect a wallet or create a devnet account");
                return;
            }

            const signer = await accountFromStored(devnetAccount);
            const aptosDevnetClient = await getDevnetClient();
            const transaction =
                await aptosDevnetClient.transaction.build.simple({
                    sender: signer.accountAddress,
                    data: {
                        function:
                            selectedFunction as `${string}::${string}::${string}`,
                        functionArguments: [],
                    },
                });
            const pending = await aptosDevnetClient.signAndSubmitTransaction({
                signer,
                transaction,
            });
            toast.success(`Transaction submitted: ${pending.hash}`);
        } catch (err) {
            toast.error(`Run failed: ${(err as Error).message}`);
        }
    };

    const handleFundDevnetAccount = async () => {
        if (!devnetAccount) {
            toast.error("Create a devnet account first");
            return;
        }
        try {
            await fundDevnetAccount(devnetAccount.address);
            toast.success("Devnet account funded");
        } catch (err) {
            toast.error(`Funding failed: ${(err as Error).message}`);
        }
    };

    const isWalletDevnet = network?.name === "devnet";
    const canWalletPublish = connected && isWalletDevnet;
    const canDevnetPublish = !connected && Boolean(devnetAccount);
    const canOnchain = connected || Boolean(devnetAccount);
    const canRunOnChain = canOnchain && Boolean(selectedFunction);

    return (
        <header className="min-h-12 bg-bg-secondary border-b border-border flex flex-wrap items-center gap-2 px-4 py-2 md:flex-nowrap md:justify-between md:py-0">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-white font-bold text-sm">
                        M
                    </div>
                    <span className="font-semibold">Move Playground</span>
                </div>
            </div>

            {/* Center: Actions */}
            <div className="flex items-center gap-2">
                {/* Run Button with Dropdown */}
                <div className="relative" ref={settingsMenuRef}>
                    <div className="flex">
                        <button
                            type="button"
                            onClick={handleRun}
                            disabled={isExecuting || wsStatus !== "connected"}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-l text-white text-sm font-medium transition-colors"
                        >
                            <Play size={14} fill="currentColor" />
                            {isExecuting ? "Running..." : "Run"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRunMenu(!showRunMenu)}
                            className="px-1.5 py-1.5 bg-accent hover:bg-accent-hover border-l border-white/20 rounded-r text-white transition-colors"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    {showRunMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-bg-tertiary border border-border rounded shadow-lg py-1 min-w-[120px] z-50">
                            <button
                                type="button"
                                onClick={() => {
                                    handleRun();
                                    setShowRunMenu(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary"
                            >
                                Run
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    execute("compile");
                                    setShowRunMenu(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary"
                            >
                                Compile
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void handlePublish();
                                    setShowRunMenu(false);
                                }}
                                disabled={
                                    !canWalletPublish && !canDevnetPublish
                                }
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary"
                                title={
                                    connected && !isWalletDevnet
                                        ? "Switch wallet to devnet"
                                        : !connected && !devnetAccount
                                          ? "Connect a wallet or create a devnet account"
                                          : undefined
                                }
                            >
                                {connected
                                    ? "Publish (Wallet)"
                                    : "Publish (Devnet account)"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleRunOnChain();
                                    setShowRunMenu(false);
                                }}
                                disabled={!canRunOnChain}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary"
                            >
                                Run (Devnet)
                            </button>
                        </div>
                    )}
                </div>

                {/* Test Button */}
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={isExecuting || wsStatus !== "connected"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-border disabled:opacity-50 rounded text-sm font-medium transition-colors"
                >
                    <FlaskConical size={14} />
                    Test
                </button>

                {/* Share Button */}
                <button
                    type="button"
                    onClick={handleShare}
                    title="Share code and named addresses"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-border rounded text-sm font-medium transition-colors"
                >
                    <Share2 size={14} />
                    Share
                </button>

                {/* Export Button */}
                <button
                    type="button"
                    onClick={() => void handleExport()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-border rounded text-sm font-medium transition-colors"
                >
                    <Download size={14} />
                    Export
                </button>
            </div>

            {/* Right: Settings */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowWalletMenu((show) => !show)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary hover:bg-border rounded text-xs font-medium transition-colors"
                    >
                        <Wallet size={14} />
                        {connected
                            ? `${account?.address?.toString().slice(0, 6)}…`
                            : "Connect"}
                    </button>

                    {showWalletMenu && (
                        <div className="absolute right-0 mt-2 w-72 bg-bg-tertiary border border-border rounded shadow-lg p-3 z-50 space-y-3 text-xs">
                            <div className="space-y-2">
                                <div className="text-text-secondary uppercase tracking-wide">
                                    AIP-62 Wallets
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-text-secondary">
                                        Target: devnet
                                    </span>
                                    <span
                                        className={`text-xs ${
                                            connected && !isWalletDevnet
                                                ? "text-error"
                                                : "text-text-secondary"
                                        }`}
                                    >
                                        Wallet:{" "}
                                        {network?.name ?? "disconnected"}
                                    </span>
                                </div>
                                {connected && !isWalletDevnet && (
                                    <div className="text-error">
                                        Network mismatch. Switch wallet to
                                        devnet to publish.
                                    </div>
                                )}
                                {connected ? (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-text-primary">
                                            {account?.address?.toString()}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => disconnect()}
                                            className="px-2 py-1 bg-bg-secondary hover:bg-border rounded"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {walletList.length === 0 ? (
                                            <span className="text-text-secondary">
                                                No AIP-62 wallets detected.
                                            </span>
                                        ) : (
                                            walletList.map((wallet) => (
                                                <button
                                                    key={wallet.name}
                                                    type="button"
                                                    onClick={() =>
                                                        connect(wallet.name)
                                                    }
                                                    className="w-full text-left px-2 py-1 bg-bg-secondary hover:bg-border rounded"
                                                >
                                                    {wallet.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 border-t border-border pt-2">
                                <div className="text-text-secondary uppercase tracking-wide">
                                    Devnet Test Account
                                </div>
                                <p className="text-text-secondary">
                                    Stored in localStorage. Export if needed.
                                    Not recommended for real funds.
                                </p>
                                {devnetAccount ? (
                                    <div className="space-y-2">
                                        <div className="text-text-primary break-all">
                                            {devnetAccount.address}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={
                                                    handleExportDevnetAccount
                                                }
                                                className="px-2 py-1 bg-bg-secondary hover:bg-border rounded"
                                            >
                                                Export
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void handleCreateDevnetAccount()
                                        }
                                        className="w-full px-2 py-1 bg-bg-secondary hover:bg-border rounded"
                                    >
                                        Create Devnet Account
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        void handleFundDevnetAccount()
                                    }
                                    disabled={!devnetAccount}
                                    className="w-full px-2 py-1 bg-bg-secondary hover:bg-border rounded disabled:opacity-50"
                                >
                                    Fund Devnet Account (Faucet)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowSettingsMenu((show) => !show)}
                        className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
                        aria-label="Settings"
                    >
                        <Settings size={18} className="text-text-secondary" />
                    </button>

                    {showSettingsMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-bg-tertiary border border-border rounded shadow-lg p-3 z-50 space-y-2 text-xs">
                            <div className="text-text-secondary uppercase tracking-wide">
                                Theme
                            </div>
                            <div className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setThemeMode("light");
                                        setShowSettingsMenu(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left ${
                                        themeMode === "light"
                                            ? "bg-bg-secondary text-text-primary"
                                            : "hover:bg-bg-secondary text-text-secondary"
                                    }`}
                                >
                                    <Sun size={14} />
                                    Light
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setThemeMode("dark");
                                        setShowSettingsMenu(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left ${
                                        themeMode === "dark"
                                            ? "bg-bg-secondary text-text-primary"
                                            : "hover:bg-bg-secondary text-text-secondary"
                                    }`}
                                >
                                    <Moon size={14} />
                                    Dark
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setThemeMode("system");
                                        setShowSettingsMenu(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left ${
                                        themeMode === "system"
                                            ? "bg-bg-secondary text-text-primary"
                                            : "hover:bg-bg-secondary text-text-secondary"
                                    }`}
                                >
                                    <Monitor size={14} />
                                    System
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span
                        className={`w-2 h-2 rounded-full ${
                            wsStatus === "connected"
                                ? "bg-accent"
                                : wsStatus === "connecting"
                                  ? "bg-warning animate-pulse"
                                  : "bg-error"
                        }`}
                    />
                    {wsStatus === "connected"
                        ? "Connected"
                        : wsStatus === "connecting"
                          ? "Connecting..."
                          : "Disconnected"}
                </div>
            </div>
        </header>
    );
}
