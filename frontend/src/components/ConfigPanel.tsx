import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../store";

export function ConfigPanel() {
    const {
        namedAddresses,
        setNamedAddresses,
        selectedFunction,
        setSelectedFunction,
        availableFunctions,
        files,
    } = useWorkspaceStore();
    const [newAddrName, setNewAddrName] = useState("");
    const [newAddrValue, setNewAddrValue] = useState("");

    // Parse available functions from code
    useEffect(() => {
        const functions: typeof availableFunctions = [];

        files.forEach((file, path) => {
            if (!path.endsWith(".move")) return;

            const content = file.content;

            // Find module name
            const moduleMatch = content.match(/module\s+(\w+)::(\w+)\s*{/);
            if (!moduleMatch) return;

            const [, ns, moduleName] = moduleMatch;

            // Find entry functions
            const entryFnRegex = /(?:public\s+)?entry\s+fun\s+(\w+)/g;
            let match: RegExpExecArray | null;
            while (true) {
                match = entryFnRegex.exec(content);
                if (!match) {
                    break;
                }
                functions.push({
                    module: `${ns}::${moduleName}`,
                    name: match[1],
                    fullName: `${ns}::${moduleName}::${match[1]}`,
                    isEntry: true,
                    isTest: false,
                    line: content.substring(0, match.index).split("\n").length,
                });
            }

            // Find test functions
            const testFnRegex = /#\[test(?:_only)?\][^}]*fun\s+(\w+)/g;
            while (true) {
                match = testFnRegex.exec(content);
                if (!match) {
                    break;
                }
                functions.push({
                    module: `${ns}::${moduleName}`,
                    name: match[1],
                    fullName: `${ns}::${moduleName}::${match[1]}`,
                    isEntry: false,
                    isTest: true,
                    line: content.substring(0, match.index).split("\n").length,
                });
            }
        });

        useWorkspaceStore.getState().setAvailableFunctions(functions);

        // Auto-select first entry function if none selected
        if (!selectedFunction && functions.length > 0) {
            const entry = functions.find((f) => f.isEntry);
            if (entry) {
                setSelectedFunction(entry.fullName);
            }
        }
    }, [files, selectedFunction, setSelectedFunction]);

    const handleAddAddress = () => {
        if (!newAddrName.trim() || !newAddrValue.trim()) return;
        setNamedAddresses({ ...namedAddresses, [newAddrName]: newAddrValue });
        setNewAddrName("");
        setNewAddrValue("");
    };

    const handleRemoveAddress = (name: string) => {
        const updated = { ...namedAddresses };
        delete updated[name];
        setNamedAddresses(updated);
    };

    const entryFunctions = availableFunctions.filter((f) => f.isEntry);
    const testFunctions = availableFunctions.filter((f) => f.isTest);

    return (
        <div className="h-full flex flex-col bg-bg-secondary overflow-y-auto">
            {/* Named Addresses Section */}
            <div className="border-b border-border">
                <div className="h-8 px-3 flex items-center">
                    <span className="text-xs font-medium text-text-secondary">
                        Named Addresses
                    </span>
                </div>

                <div className="px-3 pb-3 space-y-2">
                    {Object.entries(namedAddresses).map(([name, value]) => (
                        <div key={name} className="flex items-center gap-2">
                            <span className="text-sm text-text-secondary w-24 truncate">
                                {name}
                            </span>
                            <span className="text-sm text-text-secondary">
                                =
                            </span>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) =>
                                    setNamedAddresses({
                                        ...namedAddresses,
                                        [name]: e.target.value,
                                    })
                                }
                                className="flex-1 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-text-link"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveAddress(name)}
                                className="p-1 hover:bg-bg-tertiary rounded"
                            >
                                <X size={12} className="text-text-secondary" />
                            </button>
                        </div>
                    ))}

                    {/* Add new address */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newAddrName}
                            onChange={(e) => setNewAddrName(e.target.value)}
                            placeholder="name"
                            className="w-24 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm placeholder:text-text-secondary focus:outline-none focus:border-text-link"
                        />
                        <span className="text-sm text-text-secondary">=</span>
                        <input
                            type="text"
                            value={newAddrValue}
                            onChange={(e) => setNewAddrValue(e.target.value)}
                            placeholder="0x..."
                            className="flex-1 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm placeholder:text-text-secondary focus:outline-none focus:border-text-link"
                        />
                        <button
                            type="button"
                            onClick={handleAddAddress}
                            className="p-1 hover:bg-bg-tertiary rounded"
                        >
                            <Plus size={12} className="text-accent" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Entry Function Section */}
            <div className="px-3 py-3">
                <div className="text-xs font-medium text-text-secondary mb-2">
                    Entry Function
                </div>
                <div className="relative">
                    <select
                        value={selectedFunction ?? ""}
                        onChange={(e) =>
                            setSelectedFunction(e.target.value || null)
                        }
                        className="w-full bg-bg-tertiary border border-border rounded px-2 py-1.5 text-sm text-text-primary appearance-none focus:outline-none focus:border-text-link"
                    >
                        <option value="">Select a function...</option>
                        {entryFunctions.length > 0 && (
                            <optgroup label="Entry Functions">
                                {entryFunctions.map((f) => (
                                    <option key={f.fullName} value={f.fullName}>
                                        {f.fullName}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {testFunctions.length > 0 && (
                            <optgroup label="Test Functions">
                                {testFunctions.map((f) => (
                                    <option key={f.fullName} value={f.fullName}>
                                        {f.fullName}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    <ChevronDown
                        size={14}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                    />
                </div>
            </div>
        </div>
    );
}
