import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Extracts all valid HTTP/HTTPS URLs from a given text.
 * @param text The input text to search for URLs.
 * @returns An array of found URL strings.
 */
export const extractUrls = (text: string): string[] => {
    if (!text) return [];
    // Regex to match http/https URLs, avoiding common trailing punctuation
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);

    if (!matches) return [];

    // Clean up trailing punctuation that might have been captured
    return matches.map(url => {
        // Remove trailing periods, commas, or parenthesis if they are likely punctuation
        return url.replace(/[.,;)]+$/, '');
    }).filter(url => {
        try {
            // Verify it's a valid URL object
            new URL(url);
            return true;
        } catch {
            return false;
        }
    });
};

/**
 * Parses text and returns it as a React Node array with URLs converted to secure links.
 * This function also handles basic line breaks and sanitizes content by design (React escapes string variables).
 * @param text The input text to parse.
 * @returns A React Node containing the text with clickable links.
 */
export const linkifyMessage = (text: string): React.ReactNode => {
    if (!text) return null;

    // Split by newlines first to preserve paragraph structure
    const lines = text.split('\n');

    return (
        <>
            {lines.map((line, lineIndex) => {
                // For each line, identify URLs
                const words = line.split(/(\s+)/); // Split by whitespace but keep delimiters for spacing

                const lineContent = words.map((word, wordIndex) => {
                    // Simple check if word *looks* like a URL starting with http/https
                    // We use a similar regex to extractUrls but applied to the token
                    if (/^https?:\/\//.test(word)) {
                        // Clean the potential URL
                        const cleanUrl = word.replace(/[.,;)]+$/, '');
                        const trailing = word.substring(cleanUrl.length); // Keep trailing punctuation

                        try {
                            new URL(cleanUrl); // Validate
                            return (
                                <React.Fragment key={`${lineIndex}-${wordIndex}`}>
                                    <a
                                        href={cleanUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline break-all"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {cleanUrl}
                                    </a>
                                    {trailing}
                                </React.Fragment>
                            );
                        } catch {
                            return word;
                        }
                    }
                    return word;
                });

                return (
                    <React.Fragment key={lineIndex}>
                        {lineContent}
                        {lineIndex < lines.length - 1 && <br />}
                    </React.Fragment>
                );
            })}
        </>
    );
};
