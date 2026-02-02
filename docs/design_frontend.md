# Frontend Design: Aptos Move Playground

## Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 18+, Vite) |
| Editor | Monaco Editor (`@monaco-editor/react` v4.6+) |
| State | Zustand with immer middleware |
| Styling | Tailwind CSS v3 + CSS variables for theming |
| Icons | Lucide React |
| Toasts | Sonner |
| Resizable Panels | react-resizable-panels |

---

## Layout Specification

### Viewport
- **Minimum**: 1024x768
- **Target**: 1440x900
- **Mobile**: Not supported (show "Desktop only" message)

### Grid Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (48px fixed)                                             │
│ [Logo] [Run▾] [Test] [Share] [Examples▾]         [Settings⚙]   │
├─────────────────────────────────────────────────────────────────┤
│                         MAIN AREA                               │
│ ┌──────────┬────────────────────────┬─────────────────────────┐ │
│ │ FILE     │ EDITOR                 │ RIGHT PANEL             │ │
│ │ TREE     │                        │ ┌─────────────────────┐ │ │
│ │ (200px)  │ (flex: 1)              │ │ OUTPUT TERMINAL     │ │ │
│ │          │                        │ │ (flex: 1)           │ │ │
│ │ [+] New  │ ┌──────────────────┐   │ ├─────────────────────┤ │ │
│ │ sources/ │ │ Tab: main.move   │   │ │ CONFIG PANEL        │ │ │
│ │  └main.m │ └──────────────────┘   │ │ (240px collapsed)   │ │ │
│ │ Move.tom │                        │ │ - Named Addresses   │ │ │
│ │          │   Monaco Editor        │ │ - Entry Function    │ │ │
│ │          │                        │ │ - Options           │ │ │
│ └──────────┴────────────────────────┴─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ FOOTER (24px) [WebSocket: Connected ●] [Aptos CLI v2.4.0]       │
└─────────────────────────────────────────────────────────────────┘
```

### Panel Sizing
| Panel | Default | Min | Max | Resizable |
|-------|---------|-----|-----|-----------|
| File Tree | 200px | 150px | 300px | Yes (drag) |
| Editor | flex | 400px | - | Yes |
| Right Panel | 320px | 280px | 500px | Yes (drag) |
| Output | 60% | 100px | - | Yes (vertical) |
| Config | 40% | 80px | - | Collapsible |

---

## Component Specifications

### 1. Header Toolbar

#### Run Button (Dropdown)
- **Primary action**: Last used command (Run or Compile)
- **Dropdown items**:
  - `Compile` - aptos move compile
  - `Run` - aptos move run (requires entry function)
  - `Test` - aptos move test
- **States**: `idle`, `loading` (spinner), `disabled`
- **Shortcut badge**: `⌘↵`

#### Share Button
- **Action**: Create Gist, copy URL to clipboard
- **States**: `idle`, `loading`, `success` (checkmark, 2s)
- **Toast**: "Link copied to clipboard"

#### Examples Dropdown
- Hello World
- Counter Module
- Simple NFT
- Token Transfer
- *Separator*
- Load from Gist...

### 2. File Tree

#### Structure
```
📁 sources/
   📄 main.move
📄 Move.toml
```

#### Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Select file | Click | Opens in editor tab |
| Rename | Double-click or F2 | Inline edit |
| Delete | Right-click → Delete | Confirm dialog |
| New file | Right-click → New File | Inline name input |
| New folder | Right-click → New Folder | Inline name input |

#### Context Menu
```
├── New File
├── New Folder
├── ──────────
├── Rename (F2)
├── Delete
├── ──────────
└── Copy Path
```

### 3. Editor Tabs

#### Tab Bar
- **Max visible**: 5 tabs, then overflow dropdown
- **Close button**: Visible on hover, always visible if modified
- **Modified indicator**: White dot before filename
- **Active tab**: Highlighted background, underline accent

#### Tab States
| State | Visual |
|-------|--------|
| Clean | Normal text |
| Modified | • dot prefix, italic |
| Error | Red dot, red text |
| Active | Background highlight |

### 4. Monaco Configuration

#### Language Registration
```typescript
monaco.languages.register({ id: 'move' });

monaco.languages.setMonarchTokensProvider('move', {
  keywords: [
    'module', 'script', 'public', 'fun', 'entry', 'native',
    'struct', 'has', 'key', 'store', 'drop', 'copy',
    'let', 'mut', 'if', 'else', 'while', 'loop', 'return',
    'abort', 'break', 'continue', 'move', 'use', 'as',
    'friend', 'const', 'spec', 'schema', 'invariant',
    'acquires', 'address', 'phantom', 'inline'
  ],
  typeKeywords: [
    'u8', 'u16', 'u32', 'u64', 'u128', 'u256',
    'bool', 'address', 'signer', 'vector'
  ],
  operators: [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
    '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^',
    '%', '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
    '%=', '<<=', '>>=', '=>', '->'
  ],
  // ... tokenizer rules
});
```

#### Editor Options
```typescript
{
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  tabSize: 4,
  insertSpaces: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  formatOnPaste: true,
  suggestOnTriggerCharacters: true,
}
```

#### Error Markers
```typescript
interface MoveError {
  file: string;
  line: number;      // 1-indexed
  column: number;    // 1-indexed  
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;     // E.g., "E01001"
}

// Applied via:
monaco.editor.setModelMarkers(model, 'move-compiler', [
  {
    severity: monaco.MarkerSeverity.Error,
    message: error.message,
    startLineNumber: error.line,
    startColumn: error.column,
    endLineNumber: error.endLine ?? error.line,
    endColumn: error.endColumn ?? error.column + 1,
  }
]);
```

### 5. Output Terminal

#### Appearance
- **Font**: JetBrains Mono, 13px
- **Background**: `#0d1117` (darker than editor)
- **Colors**: ANSI 256-color support via `ansi-to-html`

#### Toolbar
```
[Clear] [Copy] [Wrap ☐]                    [↓ Auto-scroll ☑]
```

#### Content Types
| Type | Prefix | Color |
|------|--------|-------|
| stdout | none | `#e6edf3` |
| stderr | none | `#f85149` |
| system | `[system]` | `#8b949e` |
| success | `✓` | `#3fb950` |
| error | `✗` | `#f85149` |

### 6. Config Panel

#### Named Addresses Section
```
Named Addresses
┌─────────────────────────────────────────┐
│ playground     │  [0x1           ] [×] │
│ ─────────────────────────────────────── │
│ [+ Add Address]                         │
└─────────────────────────────────────────┘
```

- **Validation**: Hex format `0x[0-9a-fA-F]+` or `_` for placeholder
- **Reserved**: Cannot override `std`, `aptos_framework`, etc.

#### Entry Function Selector
```
Entry Function
┌─────────────────────────────────────────┐
│ ▾ playground::main::hello              │
├─────────────────────────────────────────┤
│   playground::main::hello              │
│   playground::main::goodbye            │
│   ──────────── Tests ────────────      │
│   playground::main::test_hello         │
└─────────────────────────────────────────┘
```

- **Parsing**: Regex `(?:public\s+)?(?:entry\s+)?fun\s+(\w+)`
- **Test detection**: `#[test]` or `#[test_only]` attribute
- **Auto-select**: If only one entry function exists

#### Options Section (Collapsible)
```
Options ▾
☐ Show bytecode output
☐ Verbose compilation
☐ Include tests in compile
```

---

## State Management

### Zustand Store
```typescript
interface PlaygroundStore {
  // Workspace
  files: Map<string, FileContent>;
  activeFile: string | null;
  openTabs: string[];
  
  // Execution
  namedAddresses: Record<string, string>;
  selectedFunction: string | null;
  availableFunctions: FunctionInfo[];
  
  // Output
  output: OutputLine[];
  errors: MoveError[];
  isExecuting: boolean;
  
  // Connection
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Sharing
  gistId: string | null;
  isDirty: boolean;
  
  // Actions
  createFile: (path: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;
  closeTab: (path: string) => void;
  
  execute: (command: 'compile' | 'run' | 'test') => Promise<void>;
  share: () => Promise<string>;
  loadFromGist: (id: string) => Promise<void>;
  loadTemplate: (name: string) => void;
  
  clearOutput: () => void;
  addOutput: (line: OutputLine) => void;
  setErrors: (errors: MoveError[]) => void;
}

interface FileContent {
  path: string;
  content: string;
  isDirty: boolean;
  language: 'move' | 'toml';
}

interface FunctionInfo {
  module: string;
  name: string;
  isEntry: boolean;
  isTest: boolean;
  line: number;
}

interface OutputLine {
  type: 'stdout' | 'stderr' | 'system' | 'success' | 'error';
  content: string;
  timestamp: number;
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Run (last command) |
| `Cmd/Ctrl + Shift + Enter` | Run Tests |
| `Cmd/Ctrl + S` | Share (create Gist) |
| `Cmd/Ctrl + B` | Toggle file tree |
| `Cmd/Ctrl + J` | Toggle output panel |
| `Cmd/Ctrl + \` | Toggle config panel |
| `Cmd/Ctrl + W` | Close active tab |
| `Cmd/Ctrl + Shift + T` | Reopen closed tab |
| `Cmd/Ctrl + P` | Quick file open |
| `F5` | Run |
| `Escape` | Cancel execution |

---

## Embed Mode (`/embed`)

### URL Parameters
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Gist ID (required) |
| `theme` | `light` \| `dark` | Theme override |
| `file` | string | Initially visible file |
| `line` | number | Highlight line |
| `output` | `show` \| `hide` | Output panel visibility |

### Embed Layout
```
┌────────────────────────────────────────┐
│ [▶ Run] [Open in Playground ↗]         │
├────────────────────────────────────────┤
│                                        │
│   Read-only Monaco Editor              │
│   (syntax highlighting only)           │
│                                        │
├────────────────────────────────────────┤
│ Output (collapsed by default)          │
│ ▾ Click to expand                      │
└────────────────────────────────────────┘
```

### Embed Script Usage
```html
<!-- Option 1: iframe -->
<iframe 
  src="https://moveplayground.sed.fyi/embed?id=abc123"
  width="100%" 
  height="400"
  frameborder="0"
></iframe>

<!-- Option 2: Script tag -->
<div data-move-playground="abc123" data-theme="dark"></div>
<script src="https://moveplayground.sed.fyi/embed.js"></script>
```

---

## Loading & Error States

### Initial Load
1. Show skeleton UI immediately
2. If `?id=` present, show "Loading snippet..." overlay
3. If Gist fails, show error toast + load default template

### Execution States
| State | UI |
|-------|-----|
| Idle | Run button enabled, green |
| Connecting | Run button disabled, "Connecting..." |
| Executing | Run button shows spinner, "Running..." |
| Success | Flash green, show checkmark 1s |
| Error | Flash red, errors in output + markers |

### WebSocket Disconnection
- Toast: "Disconnected. Reconnecting..."
- Auto-retry with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- After 3 failures, show "Reconnect" button

---

## Starter Templates

### Hello World
```move
module playground::hello {
    use std::string;
    use std::debug;

    public entry fun say_hello() {
        let message = string::utf8(b"Hello, Aptos!");
        debug::print(&message);
    }

    #[test]
    fun test_hello() {
        say_hello();
    }
}
```

### Counter
```move
module playground::counter {
    use std::signer;

    struct Counter has key {
        value: u64
    }

    public entry fun initialize(account: &signer) {
        move_to(account, Counter { value: 0 });
    }

    public entry fun increment(account: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(signer::address_of(account));
        counter.value = counter.value + 1;
    }

    #[view]
    public fun get_count(addr: address): u64 acquires Counter {
        borrow_global<Counter>(addr).value
    }

    #[test(account = @0x1)]
    fun test_counter(account: signer) acquires Counter {
        initialize(&account);
        assert!(get_count(@0x1) == 0, 0);
        increment(&account);
        assert!(get_count(@0x1) == 1, 1);
    }
}
```
