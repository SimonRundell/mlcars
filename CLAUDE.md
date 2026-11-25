# CLAUDE.md

Project: MLCars
Audience: 16-19 year old FE students: Level 2 Foundation, Level 3 BTec, Level 3 T-Level 
Stack: React + Vite + JavaScript, PHP REST API in /api, 
Host: Hostinger
Dev Environment:  Webserver is available at localhost:8080. MariaDB at localhost:3307 login root pwd 161787401 mysqld at C:\WINSRV\mariadb\bin php at C:\WINSRV\php Whole WAMP package is at C:\WINSERV. The package is available only to localhost as a security measure for this development machine. It is accepted that .htaccess is not read, but development will be targeted at an Apache Live deployment so .htaccess files should be written for that.



## Design brief

Mood: Cartoon-like computer game
Avoid: generic purple gradients, glassmorphism everywhere, centred hero with three cards, emoji as icons, drop shadows on everything.

## Skills to use for UI work

* frontend-design: before building or restyling any screen
* design:design-system: when adding tokens or components
* design:accessibility-review: before calling any screen finished

## CSS rules

* One stylesheet: `src/index.css`. No inline styles unless a value is truly dynamic (e.g. a computed width).
* No CSS-in-JS, no utility framework unless I ask.
* All colours, spacing, radii, shadows and font sizes are CSS variables in `:root`. No hardcoded hex values elsewhere.
* Class names: lowercase, hyphenated, BEM-ish (`card`, `card-title`, `card--active`).
* Mobile first. Breakpoints: 600px, 900px, 1200px.
* Use flexbox or grid, but flexbox is most preferred. No fixed pixel heights on text containers.
* Respect `prefers-reduced-motion` and `prefers-color-scheme`.

## Design tokens (edit to taste)

```css
:root {
  /\\\\\\\\\\\\\\\* Colour \\\\\\\\\\\\\\\*/
  --colour-bg: #f7f7f5;
  --colour-surface: #ffffff;
  --colour-text: #1d1f23;
  --colour-text-muted: #5b6068;
  --colour-primary: #1f5fbf;
  --colour-primary-hover: #174a96;
  --colour-accent: #e07a1f;
  --colour-success: #2e7d32;
  --colour-warning: #b26a00;
  --colour-danger: #b3261e;
  --colour-border: #d9dbe0;

  /\\\\\\\\\\\\\\\* Type \\\\\\\\\\\\\\\*/
  --font-body: "Trebuchet MS", system-ui, sans-serif;
  --font-code: "Courier New", monospace;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;
  --line-height: 1.55;

  /\\\\\\\\\\\\\\\* Space (4px scale) \\\\\\\\\\\\\\\*/
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  /\\\\\\\\\\\\\\\* Shape and depth \\\\\\\\\\\\\\\*/
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.08);
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.1);

  /\\\\\\\\\\\\\\\* Motion \\\\\\\\\\\\\\\*/
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
}
```

## Branding

* Unless the app is noted as a personal app, College/Educational apps should copy C:\Users\simonrundell\OneDrive - Exeter College\Development\cmFloatAd.jsx to /src and import to App.jsx to be visible on every page. If the component is already there, I have added it manually, so leave as is.
* During initial scaffolding I usually add a favicon.png to the public folder. This should be the App icon and should be used in the App Title and the browser bar: <link rel="icon" type="image/png" href="/favicon.png" />



## Database and PHP Backend

* Tables, views and indexes should be prefixed with a 2 or 3 letter prefix plus underscore (ie bh\_<name> or mwb\_<name>) in case we need to share databases on our webhosts
* JWT Security preferred unless otherwise indicated.
* Every PHP API project must have a shared api/cors.php file that is included at the top of every endpoint (never inline CORS headers). The cors.php pattern reflects the exact localhost:PORT origin back to the browser so Vite's dev server is accepted on any port, and handles OPTIONS preflight. Example:



&#x20;   require\_once \_\_DIR\_\_ . '/cors.php';  // always first

&#x20;   require\_once \_\_DIR\_\_ . '/db.php';



* The cors.php file should:

  * Echo back the request Origin header when it matches localhost on any port
  * Set Content-Type: application/json; charset=utf-8
  * Set Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  * Set Access-Control-Allow-Headers: Authorization, Content-Type
  * Return HTTP 200 and exit() for OPTIONS preflight requests



* For each application, whether deployed on Hostinger or Dreamhost, an .htaccess file is required to ensure that there appropriate fallback on refresh. Please use the following in the root .htacess file:
* Hostinger uses MariaDB, Dreamhost uses MySQL. This might be important for getting the collations correct on live deployment.
* Every foreign key constraint must have an explicit, globally unique name in the form fk\_<table>\_<column> (for example CONSTRAINT `fk\\\_bh\\\_admins\\\_created\\\_by`). InnoDB requires constraint names to be unique across the whole database, not just per table. Exports from Navicat and similar tools auto-name constraints `1`, `2` and so on, and reuse those names in every table, so the import fails on the second table with errno 121 "Duplicate key on write or update". Apply this rule in all schema files, migrations and seed scripts, and rename any numbered constraints before an SQL file goes to a host such as Hostinger or DreamHost. Also check that dump files wrap the inserts in SET FOREIGN\_KEY\_CHECKS=0 and 1, and that the collation exists on the target server. utf8mb4\_uca1400\_ai\_ci needs MariaDB 11.4 or later, so use utf8mb4\_unicode\_ci when the target is older or unknown.





RewriteEngine On



\# Let real files/directories (including /api/\*) resolve normally.

RewriteCond %{REQUEST\_FILENAME} -f \[OR]

RewriteCond %{REQUEST\_FILENAME} -d

RewriteRule ^ - \[L]



\# Everything else falls back to index.html so React Router can handle

\# client-side routes (e.g. a hard refresh).

RewriteRule ^ index.html \[L]



* Please ensure that .htaccess is configured so that .config.json is never exposed to the browser in either the api or root directories.





## Accessibility minimums

* Text contrast 4.5:1, large text and UI borders 3:1.
* Visible focus ring on every interactive element. Never `outline: none` without a replacement.
* Touch targets at least 44x44px.
* Every input has a label. Every image has alt text or is marked decorative.
* Fully keyboard operable. Test with Tab before finishing.
* Never rely on colour alone to show state.

## Layout and component habits

* Max content width 70ch for reading text, 1200px for app shells.
* Consistent vertical rhythm: use spacing tokens only.
* Buttons: one primary per view. Secondary is outlined. Destructive uses danger colour plus confirmation.
* Empty, loading and error states are designed for every list and form.
* Forms: labels above inputs, inline validation messages, clear submit state.
* Password: small eye at right hand side to reveal password

## Code conventions

* JavaScript, not TypeScript.
* JSDoc on every component, hook and function. PHPDoc in /api.
* Structure follows `npm create vite@latest`. React in root, backend in /api.
* API calls via Axios to PHP endpoints. Config read from `.config.json`, never exposed to the browser.
* Run `npx -y react-doctor@latest install` when a new project is created.


## Workflow

1. Before styling, state the design direction in two or three sentences and wait for a nod if the screen is new.
2. Build with tokens first, components second, pages last.
3. Smoke test only. I will run the other tests myself.
4. After UI changes, run the accessibility-review skill and list fixes. Do not apply large redesigns unasked.
5. Show a screenshot or describe the result at 375px and 1280px widths.





## Licence

Released under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0). You may share and adapt the work with credit, for non-commercial use only, and adaptations must carry the same licence. Full terms: https://creativecommons.org/licenses/by-nc-sa/4.0/ Please also include the CC graphic appropriate to the licence

