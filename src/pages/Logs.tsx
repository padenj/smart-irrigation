// Example: src/pages/Logs.tsx
import React, { useEffect, useState } from 'react';

export default function Logs() {
    const [logs, setLogs] = useState('');

    useEffect(() => {
        const fetchLogs = () => {
            fetch('/api/logs?lines=100')
                .then(res => res.text())
                .then(setLogs);
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <pre style={{ background: '#222', color: '#eee', padding: '1em', overflow: 'auto', height: '80vh' }}>
            {logs}
        </pre>
    );
}