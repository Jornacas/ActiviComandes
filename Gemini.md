# Gemini Code Analysis: Comanda de Materiales

## Project Overview

**Project Name:** Comanda de Materiales

**Description:** This is a Google Apps Script web application designed to manage requests for school materials. It provides a user-friendly interface for viewing, managing, and tracking material orders, which are synchronized from a Google Form's responses stored in a Google Sheet. The application is intended to be used by staff to streamline the process of preparing and delivering materials.

## Technologies Used

*   **Backend:** Google Apps Script (`Code.gs`)
*   **Frontend:** HTML, CSS, JavaScript (`Index.html`, `style.html`, `script.html`, `scriptnew.html`)
*   **Deployment:** `clasp` (Google Apps Script CLI)
*   **Libraries:**
    *   [Chart.js](https://www.chartjs.org/): For data visualization and statistics in the dashboard.
    *   [Font Awesome](https://fontawesome.com/): For icons used throughout the user interface.

## File Structure and Purpose

*   `Code.gs`: The heart of the application, this server-side script contains all the Google Apps Script functions. It handles:
    *   Serving the HTML user interface.
    *   Fetching and writing data to the associated Google Sheet.
    *   Synchronizing new orders from a Google Form response sheet.
    *   Updating the status of orders.
    *   Calculating and providing statistics for the dashboard.

*   `Index.html`: The main HTML file that defines the structure of the web application's user interface, including buttons, the data table, and statistical displays.

*   `style.html`: Contains all the CSS styles for the application, providing a responsive and modern look and feel.

*   `script.html` and `scriptnew.html`: These files contain the client-side JavaScript code that makes the web app interactive. Their responsibilities include:
    *   Fetching data from the server-side `Code.gs` script.
    *   Rendering the data in the main table.
    *   Handling user interactions like button clicks, row selections, and filtering.
    *   Updating the UI based on user actions.
    *   There appear to be two versions of the script, likely indicating a refactoring or new version (`scriptnew.html`).

*   `appsscript.json`: The manifest file for the Google Apps Script project. It defines project settings like the time zone, runtime version, and web app access permissions.

*   `.clasp.json`: The configuration file for `clasp`, linking the local project directory to a specific Google Apps Script project on Google Drive.

*   `.claspignore`: Specifies which files and directories should be ignored by `clasp` when pushing code to the Google Apps Script project (e.g., `node_modules`, `README.md`).

*   `package.json`: The Node.js project file that defines project metadata, development dependencies (like `clasp`), and npm scripts for common tasks like deploying the application.

*   `README.md`: The documentation file for the project, containing a brief overview, setup instructions, and usage guidelines.

## Application Flow

1.  **User Access:** A user opens the deployed web app URL.
2.  **Initial Load:** The `doGet()` function in `Code.gs` is triggered, which serves the `Index.html` page. The necessary CSS (`style.html`) and JavaScript (`script.html` or `scriptnew.html`) are included.
3.  **Data Fetching:** The client-side JavaScript calls the `loadData()` function on the server to fetch the current list of material orders from the "Comandes" sheet in the Google Sheet.
4.  **Display:** The fetched data is rendered into a filterable and searchable table in the UI.
5.  **Synchronization:** The user can click the "Sincronizar Entradas" button, which triggers the `sincronizarEntradas()` function on the server. This function reads new entries from the Google Form response sheet and adds them to the "Comandes" sheet, avoiding duplicates.
6.  **Status Management:** Users can select one or more orders in the table and change their status (e.g., "Preparado", "En proceso", "Entregado") using the action buttons. This calls the `actualizarEstado()` or `actualizarEstadoMultiple()` functions on the server to update the Google Sheet.
7.  **Delivery Update:** The "Actualizar Entregas" button runs the `actualizarCentrosDeEntregaYDia()` function, which automatically assigns delivery locations and days based on predefined logic.
8.  **Dashboard:** A dashboard feature is available to visualize statistics about the orders, such as the number of requests per monitor, school, or material.

## How to Set Up and Deploy

(As summarized from the `README.md`)

1.  **Google Sheet:** Create a Google Sheet with the following tabs: `Comandes`, `dades`, `ordre_distancia_escoles`, and a sheet for Google Form responses.
2.  **Google Form:** Create a Google Form for material requests and link its responses to the corresponding sheet.
3.  **Clasp:** Install `clasp` globally (`npm install -g @google/clasp`).
4.  **Authentication:** Log in to your Google account using `clasp login`.
5.  **Project:** Create a new Google Apps Script project or link to an existing one using `clasp create` or by editing `.clasp.json`.
6.  **Push Files:** Upload the local files to the Google Apps Script project with `clasp push`.
7.  **Deploy:** Deploy the project as a web app from the Google Apps Script editor or via the command line (`clasp deploy`).
