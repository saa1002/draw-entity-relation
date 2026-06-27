import * as React from "react";
import "./styles.css";
import DiagramEditor from "./components/DiagramEditor/DiagramEditor";
import { LanguageProvider } from "./i18n/LanguageContext";

export default function App() {
    return (
        <LanguageProvider>
            <div className="App">
                <div className="container">
                    <DiagramEditor />
                </div>
            </div>
        </LanguageProvider>
    );
}
