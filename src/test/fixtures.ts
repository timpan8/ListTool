/**
 * Shared test data. Everything here is invented: example.com throughout, no real people
 * and no real organisation addresses.
 *
 * The one exception is OUTLOOK_RECIPIENTS, which SPEC §4 pins verbatim — including its
 * exempel.com domain — as the reference case for the Recipients parser. It stays exactly
 * as written there.
 */

/** SPEC §4, verbatim. Expected with "Last First": (first1, last1, …), (first2, last2, …). */
export const OUTLOOK_RECIPIENTS =
  'last1 first1 <last1.first1@exempel.com>; last2 first2 <first2.last2@exempel.com>; last3 first3 <first3.last3@exempel.com>';

/** A quoted display name whose comma is not a separator (RFC 5322 §3.4), plus a bare email. */
export const QUOTED_AND_BARE =
  '"Andersson, Anna" <anna.andersson@example.com>; bob@example.com';

/** Swedish characters in both the display name and the local part. */
export const SWEDISH_RECIPIENT = 'Öberg Åsa <asa.oberg@example.com>';

/** CRLF line endings and a trailing separator with nothing after it. */
export const CRLF_TRAILING_SEMICOLON =
  'last1 first1 <last1.first1@example.com>;\r\nlast2 first2 <last2.first2@example.com>;\r\n';

/** Three values on one line, the shape SPEC §3's detection example uses. */
export const COMMA_LINE = 'data1, data2, data3';

/** One value per line, no delimiter anywhere. */
export const THREE_LINES = 'alpha\nbeta\ngamma';

/** Empty entries between delimiters, and whitespace that needs trimming. */
export const EMPTY_ENTRIES = 'alpha,, beta ,,gamma,';

/** Tab-separated table with a header row. */
export const TAB_TABLE = 'first\tlast\temail\nAnna\tAndersson\tanna@example.com\nBo\tBerg\tbo@example.com';

/** CSV with a header, a quoted field containing a comma, and Swedish characters. */
export const CSV_WITH_HEADER =
  'name,email\n"Andersson, Anna",anna@example.com\nÅsa Öberg,asa@example.com';

/** CSV whose lines end in CRLF and which ends with a trailing newline. */
export const CSV_CRLF = 'name,email\r\nAnna,anna@example.com\r\nBo,bo@example.com\r\n';

/**
 * Two lists whose duplicate counts disagree: anna appears twice in A and once in B,
 * bob once in A and twice in B. A plain Set would lose exactly this.
 */
export const COMPARE_A = 'anna@example.com\nbob@example.com\nanna@example.com\ncharlie@example.com';
export const COMPARE_B = 'anna@example.com\nbob@example.com\nbob@example.com\ndavid@example.com';

/** The same address written with different case and padding — normalization fodder. */
export const MESSY_CASE = 'Anna@Example.com \n anna@example.com\nANNA@EXAMPLE.COM';
