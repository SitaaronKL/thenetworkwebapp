'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';

interface AvailabilityBlock {
    id: string;
    start_time: string;
    end_time: string;
    city?: string;
    is_recurring?: boolean;
    recurring_day_of_week?: number;
    notes?: string;
}

interface AvailabilityCalendarProps {
    city?: string;
    onBlocksUpdated?: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

export default function AvailabilityCalendar({ city, onBlocksUpdated }: AvailabilityCalendarProps) {
    const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null);
    const [selecting, setSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ day: number; hour: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        loadBlocks();
    }, [city, currentWeek]);

    const loadBlocks = async () => {
        try {
            setLoading(true);
            // Increase days_ahead to 30 to show more blocks
            const url = city 
                ? `/api/availability?city=${encodeURIComponent(city)}&days_ahead=30`
                : '/api/availability?days_ahead=30';
            const response = await fetch(url);
            const data = await response.json();
            console.log('Loaded availability blocks:', data.blocks?.length || 0, data.blocks);
            setBlocks(data.blocks || []);
        } catch (error) {
            console.error('Error loading availability blocks:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get start of week (Sunday)
    const getWeekStart = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const weekStart = getWeekStart(currentWeek);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        return day;
    });

    // Check if a time slot is in a block
    const isSlotInBlock = (day: number, hour: number): AvailabilityBlock | null => {
        const slotDate = new Date(weekDays[day]);
        slotDate.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotDate);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        for (const block of blocks) {
            const blockStart = new Date(block.start_time);
            const blockEnd = new Date(block.end_time);
            
            // Check if slot overlaps with block
            if (slotDate >= blockStart && slotDate < blockEnd) {
                return block;
            }
        }
        return null;
    };

    // Check if slot is in current selection
    const isSlotSelected = (day: number, hour: number): boolean => {
        if (!selectionStart || !selectedSlot) return false;
        
        const minDay = Math.min(selectionStart.day, selectedSlot.day);
        const maxDay = Math.max(selectionStart.day, selectedSlot.day);
        const minHour = Math.min(selectionStart.hour, selectedSlot.hour);
        const maxHour = Math.max(selectionStart.hour, selectedSlot.hour);
        
        // Check if this slot is within the selection range
        if (day < minDay || day > maxDay) return false;
        if (day === minDay && hour < minHour) return false;
        if (day === maxDay && hour > maxHour) return false;
        
        // For days in between, include all hours
        if (day > minDay && day < maxDay) return true;
        
        // For boundary days, check hour range
        return hour >= minHour && hour <= maxHour;
    };

    const handleSlotMouseDown = (day: number, hour: number) => {
        setSelecting(true);
        setSelectionStart({ day, hour });
        setSelectedSlot({ day, hour });
    };

    const handleSlotMouseEnter = (day: number, hour: number) => {
        if (selecting && selectionStart) {
            setSelectedSlot({ day, hour });
        }
    };

    const handleSlotMouseUp = () => {
        if (selecting && selectionStart && selectedSlot) {
            setSelecting(false);
        }
    };

    const handleSaveSelection = async () => {
        if (!selectionStart || !selectedSlot) return;

        const minDay = Math.min(selectionStart.day, selectedSlot.day);
        const maxDay = Math.max(selectionStart.day, selectedSlot.day);
        const minHour = Math.min(selectionStart.hour, selectedSlot.hour);
        const maxHour = Math.max(selectionStart.hour, selectedSlot.hour);

        // Create blocks for each day in selection
        setSaving(true);
        try {
            const promises = [];
            
            for (let day = minDay; day <= maxDay; day++) {
                const date = new Date(weekDays[day]);
                const startHour = day === minDay ? minHour : 0;
                const endHour = day === maxDay ? maxHour + 1 : 24;
                
                // Skip if end hour is 24 (next day)
                if (endHour > 24) continue;
                
                const startTime = new Date(date);
                startTime.setHours(startHour, 0, 0, 0);
                
                const endTime = new Date(date);
                endTime.setHours(endHour, 0, 0, 0);
                
                // Skip if time range is invalid
                if (endTime <= startTime) continue;
                
                promises.push(
                    fetch('/api/availability', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            start_time: startTime.toISOString(),
                            end_time: endTime.toISOString(),
                            city: city || null
                        })
                    })
                );
            }
            
            const responses = await Promise.all(promises);
            
            // Check for errors
            for (const response of responses) {
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to save block');
                }
            }
            
            await loadBlocks();
            setSelectionStart(null);
            setSelectedSlot(null);
            // Notify parent component that blocks were updated
            // Add a small delay to ensure database has fully committed
            console.log('✅ Availability block saved, calling onBlocksUpdated callback');
            setTimeout(() => {
                if (onBlocksUpdated) {
                    console.log('🔄 Calling onBlocksUpdated callback');
                    onBlocksUpdated();
                } else {
                    console.warn('⚠️ onBlocksUpdated callback not provided');
                }
            }, 500);
        } catch (error: any) {
            console.error('Error saving availability block:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBlock = async (blockId: string) => {
        if (!confirm('Delete this availability block?')) return;
        
        try {
            const response = await fetch(`/api/availability?id=${blockId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete block');
            }
            
            await loadBlocks();
            // Notify parent component that blocks were updated
            // Add a small delay to ensure database has fully committed
            setTimeout(() => {
                if (onBlocksUpdated) {
                    onBlocksUpdated();
                }
            }, 300);
        } catch (error) {
            console.error('Error deleting block:', error);
            alert('Error deleting block');
        }
    };

    const handleClearSelection = () => {
        setSelectionStart(null);
        setSelectedSlot(null);
        setSelecting(false);
    };

    const handlePrevWeek = () => {
        const prev = new Date(currentWeek);
        prev.setDate(prev.getDate() - 7);
        console.log('📅 Previous week:', prev.toLocaleDateString());
        setCurrentWeek(new Date(prev)); // Create new Date object to ensure React detects change
    };

    const handleNextWeek = () => {
        const next = new Date(currentWeek);
        next.setDate(next.getDate() + 7);
        console.log('📅 Next week:', next.toLocaleDateString());
        setCurrentWeek(new Date(next)); // Create new Date object to ensure React detects change
    };

    const handleToday = () => {
        const today = new Date();
        console.log('📅 Today:', today.toLocaleDateString());
        setCurrentWeek(new Date(today)); // Create new Date object to ensure React detects change
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Your Availability</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const hasSelection = selectionStart && selectedSlot;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Your Availability</CardTitle>
                                <CardDescription>
                                    Block out times when you're free. Plans will be generated for these slots.
                                </CardDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="ml-4"
                            >
                                {isCollapsed ? '▼' : '▲'}
                            </Button>
                        </div>
                    </div>
                </div>
                {!isCollapsed && (
                    <div className="flex items-center gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                            ←
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleToday}>
                            Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextWeek}>
                            →
                        </Button>
                        <div className="flex-1 text-sm font-medium text-center">
                            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                )}
            </CardHeader>
            {!isCollapsed && (
                <CardContent>
                    <div className="space-y-4">
                    {/* Calendar Grid */}
                    <div className="border rounded-lg overflow-hidden">
                        {/* Header Row */}
                        <div className="grid grid-cols-8 border-b bg-muted/50">
                            <div className="p-2 text-xs font-medium text-muted-foreground">Time</div>
                            {DAYS.map((day, idx) => (
                                <div key={idx} className="p-2 text-center text-xs font-medium border-l">
                                    <div>{day}</div>
                                    <div className="text-muted-foreground">{weekDays[idx].getDate()}</div>
                                </div>
                            ))}
                        </div>

                        {/* Hour Rows */}
                        <div className="max-h-[600px] overflow-y-auto">
                            {HOURS.map((hour) => (
                                <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                                    <div className="p-2 text-xs text-muted-foreground border-r">
                                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                    </div>
                                    {DAYS.map((_, dayIdx) => {
                                        const block = isSlotInBlock(dayIdx, hour);
                                        const isSelected = isSlotSelected(dayIdx, hour);
                                        
                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`p-1 border-l cursor-pointer transition-colors ${
                                                    block
                                                        ? 'bg-green-500/20 hover:bg-green-500/30'
                                                        : isSelected
                                                        ? 'bg-blue-500/30 hover:bg-blue-500/40'
                                                        : 'hover:bg-muted/50'
                                                }`}
                                                onMouseDown={() => handleSlotMouseDown(dayIdx, hour)}
                                                onMouseEnter={() => handleSlotMouseEnter(dayIdx, hour)}
                                                onMouseUp={handleSlotMouseUp}
                                                title={block ? `Block: ${new Date(block.start_time).toLocaleTimeString()} - ${new Date(block.end_time).toLocaleTimeString()}` : ''}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selection Actions */}
                    {hasSelection && (
                        <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex-1">
                                {selectionStart && selectedSlot && (
                                    <div className="text-sm">
                                        <div className="font-medium mb-1">Selected Time Block:</div>
                                        <div className="text-muted-foreground">
                                            {DAYS[Math.min(selectionStart.day, selectedSlot.day)]} {Math.min(selectionStart.hour, selectedSlot.hour)}:00 -{' '}
                                            {DAYS[Math.max(selectionStart.day, selectedSlot.day)]} {Math.max(selectionStart.hour, selectedSlot.hour) + 1}:00
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="default" 
                                    onClick={handleSaveSelection} 
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {saving ? 'Saving...' : 'Save Availability'}
                                </Button>
                                <Button size="default" variant="outline" onClick={handleClearSelection}>
                                    Clear
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {/* Instructions when no selection */}
                    {!hasSelection && (
                        <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground text-center">
                            Click and drag on the calendar to select your free times, then click "Save Availability"
                        </div>
                    )}

                    {/* Existing Blocks List */}
                    {blocks.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Your Availability Blocks</h3>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {blocks.map((block) => {
                                    const start = new Date(block.start_time);
                                    const end = new Date(block.end_time);
                                    return (
                                        <div
                                            key={block.id}
                                            className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                                        >
                                            <div>
                                                {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                                                {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} -{' '}
                                                {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                {block.city && <span className="text-muted-foreground ml-2">({block.city})</span>}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteBlock(block.id)}
                                                className="h-6 px-2 text-xs"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
