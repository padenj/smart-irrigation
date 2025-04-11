import React, { useEffect, useState } from 'react';

export const VersionDisplay: React.FC = () => {
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const response = await fetch('/api/version');
                if (response.ok) {
                    const data = await response.json();
                    setVersion(data?.version);
                } else {
                    console.error('Failed to fetch version');
                }
            } catch (error) {
                console.error('Error fetching version:', error);
            }
        };

        fetchVersion();
    }, []);

    return (
        <small style={{  fontSize: '0.8em', color: '#666' }}>
            {version ? `Version: ${version}` : 'Loading version...'}
        </small>
    );
};
