"use client";

import { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

// Helper to safely parse markdown itinerary into blocks
function parseItinerary(markdown: string) {
    if (!markdown) return [];
    const days = markdown.split(/(?=\*\*Day \d+:?\*\*)/i).filter(d => d.trim());
    return days.map((dayText, idx) => ({
        id: `day-${idx + 1}`,
        rawText: dayText.trim(),
        title: dayText.match(/\*\*Day \d+:?\*\*/i)?.[0]?.replace(/\*\*/g, '') || `Day ${idx + 1}`,
        content: dayText.replace(/\*\*Day \d+:?\*\*/i, '').trim()
    }));
}

interface SortableItemProps {
    id: string;
    day: any;
}

function SortableItem({ id, day }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`mb-4 ${isDragging ? "opacity-50" : ""}`}>
            <div className="glass-card p-4 border-l-4 border-l-accent border-accent/20 bg-surface/50 relative group">
                {/* Drag Handle */}
                <span 
                    {...attributes} 
                    {...listeners} 
                    className="absolute right-3 top-3 cursor-grab active:cursor-grabbing text-text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100 p-1"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
                        <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
                    </svg>
                </span>
                
                <h5 className="font-orbitron font-bold text-sm text-accent mb-2">{day.title}</h5>
                <div className="font-space text-xs text-text-primary whitespace-pre-wrap leading-relaxed opacity-90">
                    {day.content.replace(/-/g, '•')}
                </div>
            </div>
        </div>
    );
}

export function DraggableItinerary({ itineraryText }: { itineraryText: string }) {
    const [days, setDays] = useState<{id: string; title: string; content: string}[]>([]);

    useEffect(() => {
        setDays(parseItinerary(itineraryText));
    }, [itineraryText]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setDays((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    if (days.length === 0) return null;

    return (
        <div className="mt-4">
            <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-4 flex justify-between items-center">
                <span>📅 Interactive Itinerary</span>
                <span className="text-[10px] text-text-muted tracking-normal normal-case">Drag blocks to reorder</span>
            </h4>
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={days.map(d => d.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <motion.div layout className="space-y-3 pl-2 border-l-2 border-dashed border-accent/20">
                        {days.map(day => (
                            <SortableItem key={day.id} id={day.id} day={day} />
                        ))}
                    </motion.div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
