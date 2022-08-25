/**
 * Check if module body contains DNA component definitions.
 * @param {string} body
 */
export function containsComponent(body) {
    const matches = body.match(/import\s*\{([^}]*)\}\s*from\s*['|"]@chialab\/dna['|"]/g);
    if (!matches) {
        return false;
    }

    const specs = matches
        .map((importMatch) => {
            const match = importMatch.match(/import\s*\{([^}]*)\}\s*from\s*['|"]@chialab\/dna['|"]/);
            if (match) {
                return match[1];
            }
            return [];
        })
        .flat()
        .map((match) => match.split(','))
        .flat()
        .map((match) => match.trim());

    return specs.includes('customElement') || specs.includes('customElements');
}
