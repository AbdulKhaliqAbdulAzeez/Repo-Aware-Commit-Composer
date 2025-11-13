/**
 * Wrap text to specified width
 */
export function wrapText(text: string, width: number = 72): string {
    const lines = text.split('\n');
    const wrapped: string[] = [];

    for (const line of lines) {
        if (line.length <= width) {
            wrapped.push(line);
        } else {
            wrapped.push(...wrapLine(line, width));
        }
    }

    return wrapped.join('\n');
}

/**
 * Wrap a single line
 */
function wrapLine(line: string, width: number): string[] {
    const words = line.split(' ');
    const result: string[] = [];
    let current = '';

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;

        if (test.length <= width) {
            current = test;
        } else {
            if (current) {
                result.push(current);
            }
            current = word;
        }
    }

    if (current) {
        result.push(current);
    }

    return result;
}

/**
 * Indent text by specified spaces
 */
export function indent(text: string, spaces: number = 2): string {
    const prefix = ' '.repeat(spaces);
    return text
        .split('\n')
        .map((line) => (line ? prefix + line : line))
        .join('\n');
}
