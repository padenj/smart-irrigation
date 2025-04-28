import React, { useEffect, useState } from "react";
import { remult } from "remult";
import { LcdPage } from "../shared/lcdPages";

export default function Display() {
    const [pages, setPages] = useState<LcdPage[]>([]);

    useEffect(() => {
        const repo = remult.repo(LcdPage);
        const subscription = repo.liveQuery().subscribe(({ items }) => {
            setPages(items);
        });
        // Initial fetch in case liveQuery doesn't emit immediately
        repo.find().then(setPages);
        return subscription;
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <h1>LCD Pages</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                {pages.map((page) => (
                    <div
                        key={page.id}
                        style={{
                            border: "1px solid #ccc",
                            borderRadius: 8,
                            padding: 16,
                            minWidth: 250,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                            background: "#fff",
                        }}
                    >
                        <h2>Page {page.pageNumber}</h2>
                        <ul>
                            {page.lines.map((line: string, idx: number) => (
                                <li key={idx}>{line}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}