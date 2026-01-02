/**
 * Validates if a chart configuration is standard and meaningful.
 * Returns strict rules for "Power BI" like behavior.
 * 
 * @param {String} type - 'bar', 'line', 'pie', 'doughnut', 'scatter'
 * @param {Object} xCol - Metadata for X-Axis column
 * @param {Object} yCol - Metadata for Y-Axis column
 * @returns {Object} { valid, severity, reason, suggestedType }
 * severity: 'BLOCK' | 'WARN' | 'AUTO_FIX' | null
 */
export const validateChart = (type, xCol, yCol) => {
    if (!xCol || !yCol) return { valid: false, severity: 'BLOCK', reason: "Select axes first" };

    const uniqueX = xCol.stats.uniqueCount || 0;
    const isXNumeric = xCol.type === 'number';
    const isYNumeric = yCol.type === 'number';
    const hasNegatives = yCol.stats.min < 0;

    // --- SCATTER RULES ---
    // Rule: Numeric vs Numeric MUST be Scatter
    if (isXNumeric && isYNumeric) {
        if (type !== 'scatter') {
            return {
                valid: false,
                severity: 'AUTO_FIX',
                reason: "Both axes are numeric. Switching to Scatter Plot.",
                suggestedType: 'scatter'
            };
        }
        return { valid: true };
    }

    // Rule: Scatter MUST be Numeric vs Numeric
    if (type === 'scatter') {
        if (!isXNumeric || !isYNumeric) {
            return {
                valid: false,
                severity: 'BLOCK',
                reason: "Scatter plots require both axes to be numeric."
            };
        }
    }

    // --- PIE / DOUGHNUT RULES ---
    if (type === 'pie' || type === 'doughnut') {
        if (isXNumeric) {
            return {
                valid: false,
                severity: 'BLOCK',
                reason: "Pie charts require a categorical X-axis."
            };
        }
        if (hasNegatives) {
            return {
                valid: false,
                severity: 'BLOCK',
                reason: "Pie charts cannot display negative values."
            };
        }
        if (uniqueX > 6) {
            return {
                valid: false,
                severity: 'BLOCK', // User requested: "Pie option is disabled"
                reason: `Too many slices (${uniqueX} > 6).`,
            };
        }
        return { valid: true };
    }

    // --- BAR RULES ---
    if (type === 'bar') {
        if (isXNumeric && uniqueX > 20) {
            return {
                valid: false,
                severity: 'AUTO_FIX',
                reason: "Continuous numeric X-axis. Switching to Scatter.",
                suggestedType: 'scatter'
            };
        }
        // If categorical and high cardinality
        if (uniqueX > 20) {
            return {
                valid: true,
                severity: 'WARN',
                reason: `High cardinality (${uniqueX}). Will show Top 20 items.`,
            };
        }
        return { valid: true };
    }

    // --- LINE RULES ---
    if (type === 'line') {
        if (xCol.type !== 'date' && !isXNumeric) {
            return {
                valid: false,
                severity: 'BLOCK',
                reason: "Line charts require Date or Numeric X-axis for trends."
            };
        }
        return { valid: true };
    }

    return { valid: true };
};

/**
 * Suggests the best default chart for a given pair of axes.
 */
export const suggestSmartConfig = (xCol, yCol) => {
    if (!xCol || !yCol) return null;

    if (xCol.type === 'number' && yCol.type === 'number') {
        return { type: 'scatter', aggregation: null };
    }

    if (xCol.type === 'date' && yCol.type === 'number') {
        return { type: 'line', aggregation: 'mean' };
    }

    if (xCol.type !== 'number' && yCol.type === 'number') {
        return { type: 'bar', aggregation: 'mean' };
    }

    return null;
};
