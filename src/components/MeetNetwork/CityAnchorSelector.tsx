'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CityAnchorSelectorProps {
    onAnchorSet: (anchor: { city: string; source: string; source_data?: any }) => void;
}

export default function CityAnchorSelector({ onAnchorSet }: CityAnchorSelectorProps) {
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetCity = async () => {
        if (!city.trim()) return;

        setLoading(true);
        try {
            const response = await fetch('/api/city-anchor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: city.trim(),
                    source: 'manual',
                    source_data: {}
                })
            });

            const data = await response.json();
            if (data.anchor) {
                onAnchorSet(data.anchor);
            }
        } catch (error) {
            console.error('Error setting city anchor:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Set Your City</CardTitle>
                <CardDescription>
                    Choose your city to see ready-to-go plans with your local network
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                        id="city"
                        placeholder="e.g., New York City, Toronto, San Francisco"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSetCity();
                            }
                        }}
                    />
                </div>
                <Button onClick={handleSetCity} disabled={!city.trim() || loading}>
                    {loading ? 'Setting...' : 'Set City'}
                </Button>
            </CardContent>
        </Card>
    );
}
