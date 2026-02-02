/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                "bg-primary": "#0d1117",
                "bg-secondary": "#161b22",
                "bg-tertiary": "#21262d",
                border: "#30363d",
                "text-primary": "#e6edf3",
                "text-secondary": "#8b949e",
                "text-link": "#58a6ff",
                accent: "#238636",
                "accent-hover": "#2ea043",
                warning: "#d29922",
                error: "#f85149",
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
            },
        },
    },
    plugins: [],
};
