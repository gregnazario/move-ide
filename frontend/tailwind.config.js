/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                "bg-primary": "var(--bg-primary)",
                "bg-secondary": "var(--bg-secondary)",
                "bg-tertiary": "var(--bg-tertiary)",
                border: "var(--border)",
                "text-primary": "var(--text-primary)",
                "text-secondary": "var(--text-secondary)",
                "text-link": "var(--text-link)",
                accent: "var(--accent)",
                "accent-hover": "var(--accent-hover)",
                warning: "var(--warning)",
                error: "var(--error)",
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
            },
        },
    },
    plugins: [],
};
