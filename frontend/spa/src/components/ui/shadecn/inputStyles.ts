/**
 * The look shared by the text inputs and text areas: surface, border, text and placeholder colours, focus ring. Kept in
 * one place so a single-line field and a multi-line field next to it cannot drift apart.
 */
export const INPUT_SURFACE =
    'w-full text-gray-800 dark:text-gray-100 text-sm border border-[#E0E0E6] dark:border-gray-700 px-3 rounded-xl bg-white dark:bg-[var(--purple-50)] ' +
    // Lighter than the entered text, so a placeholder does not read as a value
    'placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors ' +
    'focus:border-[var(--purple-300)] focus-visible:border-[var(--purple-300)] focus:outline-none focus:ring-2 focus:ring-[var(--purple-50)] ' +
    'disabled:cursor-not-allowed disabled:opacity-50';
