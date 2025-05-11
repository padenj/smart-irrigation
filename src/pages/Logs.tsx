// Example: src/pages/Logs.tsx
import React, { useEffect, useState } from 'react';

export default function Logs() {
    const [logs, setLogs] = useState('');
    const [lines, setLines] = useState(100);
    const [topOutput, setTopOutput] = useState('');

    useEffect(() => {
        const fetchLogs = () => {
            fetch(`/api/logs?lines=${lines}`)
                .then(res => res.text())
                .then(setLogs);
        };

        const fetchTopOutput = () => {
            fetch(`/api/system/top`)
                .then(res => res.text())
                .then(setTopOutput);
        };

        fetchLogs();
        fetchTopOutput();

        const interval = setInterval(() => {
            fetchLogs();
            fetchTopOutput();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <div style={{ marginBottom: '1em' }}>
                <label>
                    Number of lines:{' '}
                    <input
                        type="number"
                        value={lines}
                        onChange={(e) => setLines(Number(e.target.value))}
                        style={{ width: '5em' }}
                    />
                </label>
            </div>
            <pre style={{ 
                background: '#222', 
                color: '#eee', 
                padding: '1em', 
                overflow: 'auto', 
                height: '70vh', 
                fontSize: '0.75em', 
                whiteSpace: 'pre-wrap', 
                wordWrap: 'break-word' 
            }}>
                {logs}
            </pre>
            <div style={{ marginTop: '1em' }}>
                <h3>System Top Output</h3>
                <pre style={{ 
                    background: '#333', 
                    color: '#fff', 
                    padding: '1em', 
                    overflow: 'auto', 
                    height: '70vh', 
                    fontSize: '0.75em', 
                    whiteSpace: 'pre-wrap', 
                    wordWrap: 'break-word' 
                }}>
                    {topOutput}
                </pre>
            </div>
        </div>
    );
}