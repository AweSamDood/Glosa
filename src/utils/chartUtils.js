// src/utils/chartUtils.js

export const getAdviceColor = (advice) => {
    if (!advice) return '#9ca3af'; // gray for null

    if (advice.includes('accelerate')) return '#22c55e'; // green
    if (advice.includes('decelerate')) return '#ef4444'; // red
    if (advice.includes('cruise')) return '#3b82f6'; // blue
    if (advice.includes('cannotCatchGreen')) return '#f97316'; // orange
    if (advice.includes('willArriveTooEarly')) return '#a855f7'; // purple
    if (advice.includes('none_movement_event_unavailable')) return '#d1d5db'; // light gray
    if (advice.includes('none_ttg_unavailable')) return '#d1d5db'; // light gray
    if (advice.includes('none_green_duration_unavailable')) return '#d1d5db'; // light gray
    if (advice.includes('none_advice_speed_out_of_range')) return '#d1d5db'; // light gray
    if (advice.includes('none')) return '#9ca3af'; // gray

    return '#6b7280'; // default gray
};