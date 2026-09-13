# Email template library

Any Outlook `.oft` file placed in this folder or one of its subfolders is included automatically on the Network Success > Email Templates page after the client is rebuilt.

The page creates a readable title and a general use case for new files automatically. To provide a more specific title or use case, add an entry keyed by the file name (without `.oft`) to `src/pages/network-success/emailTemplateLibrary.js`.

Use the `RELIABILITY_PROFITABILITY` folder name for templates that should appear in the Reliability & Profitability category. Templates elsewhere in this folder appear under Provider Management unless their metadata specifies another category.
