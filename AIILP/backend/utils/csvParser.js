// ============================================
// CSV Parser Utility
// Handles CSV file parsing and validation for bulk student registration
// ============================================

/**
 * Parse CSV text into array of objects
 * @param {string} csvText - CSV file content as text
 * @param {object} options - Parser options
 * @returns {Promise<object>} - Parsed data and errors
 */
export const parseCSV = (csvText, options = {}) => {
    try {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            return {
                data: null,
                error: 'CSV file must contain at least a header row and one data row'
            };
        }

        // Parse header and normalize to lowercase
        const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
        const expectedHeaders = [
            'name',
            'email',
            'student_id',
            'batch',
            'degree_program',
            'semester'
        ];

        // Validate headers (header is already lowercase)
        const missingHeaders = expectedHeaders.filter(h => !header.includes(h));
        if (missingHeaders.length > 0) {
            return {
                data: null,
                error: `Missing required headers: ${missingHeaders.join(', ')}`
            };
        }

        // Parse data rows
        const data = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                
                if (values.length !== header.length) {
                    errors.push({
                        row: i + 1,
                        error: `Row ${i + 1} has ${values.length} columns, expected ${header.length}`
                    });
                    continue;
                }

                const row = {};
                header.forEach((col, index) => {
                    // Header is already normalized to lowercase
                    row[col] = values[index]?.trim() || '';
                });

                data.push(row);
            } catch (error) {
                errors.push({
                    row: i + 1,
                    error: error.message
                });
            }
        }

        if (errors.length > 0 && data.length === 0) {
            return {
                data: null,
                error: `Failed to parse CSV: ${errors[0].error}`
            };
        }

        return {
            data,
            errors: errors.length > 0 ? errors : null,
            error: null
        };
    } catch (error) {
        console.error('CSV parsing error:', error);
        return {
            data: null,
            error: error.message
        };
    }
};

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array<string>} - Array of values
 */
const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add last field
    values.push(current);

    return values;
};

/**
 * Validate student CSV data
 * @param {object} studentData - Student data object
 * @returns {object} - Validation result
 */
export const validateStudentCSV = (studentData) => {
    const errors = [];

    // Required fields
    if (!studentData.name || studentData.name.trim() === '') {
        errors.push('Name is required');
    }

    if (!studentData.email || studentData.email.trim() === '') {
        errors.push('Email is required');
    } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.email)) {
            errors.push('Invalid email format');
        }
    }

    if (!studentData.student_id || studentData.student_id.trim() === '') {
        errors.push('Student ID is required');
    }

    // Optional but recommended fields
    if (studentData.batch && isNaN(studentData.batch)) {
        errors.push('Batch must be a number');
    }

    return {
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : null
    };
};

/**
 * Generate CSV template
 * @returns {string} - CSV template string
 */
export const generateCSVTemplate = () => {
    const headers = [
        'name',
        'email',
        'student_id',
        'batch',
        'degree_program',
        'semester'
    ];

    const exampleRow = [
        'John Doe',
        'john.doe@example.com',
        'STU001',
        '2022',
        'BSE',
        '6'
    ];

    return [headers.join(','), exampleRow.join(',')].join('\n');
};

/**
 * Convert array of student objects to CSV
 * @param {Array<object>} students - Array of student objects
 * @returns {string} - CSV string
 */
export const studentsToCSV = (students) => {
    if (!students || students.length === 0) {
        return '';
    }

    const headers = [
        'name',
        'email',
        'student_id',
        'batch',
        'degree_program',
        'semester'
    ];

    const rows = students.map(student => [
        student.name || '',
        student.email || '',
        student.student_id || '',
        student.batch || '',
        student.degree_program || '',
        student.semester || ''
    ]);

    const csvRows = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            // Escape commas and quotes
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(','))
    ];

    return csvRows.join('\n');
};

