# CodePulse AI
**From Test Plan to Automation – Instantly**

---

## 🌟 Overview
CodePulse AI, powered by OpenAI’s GPT-4o, is an advanced tool designed to automate and streamline the creation of testing artifacts from HAR or Postman collection files. By leveraging the intelligent capabilities of GPT-4o, CodePulse AI significantly reduces the effort required to generate comprehensive testing documentation and scripts.

With just a few clicks, developers and testers can quickly transform HAR or Postman collection files into structured test plans, test scenarios, detailed test cases, and Playwright automation scripts.

---


## 🚀 Key Features

- **Professional Document Export (Word, PDF, Excel):** Instantly generate professionally formatted documents for all artifact types (Test Plan, Test Scenarios, Test Cases) in DOCX, PDF, and XLSX formats. All exports include complete information, consistent formatting, clear headings, bold labels, bullet points, tables, and section spacing for maximum readability and presentation quality.
- **Export Parity & Completeness:** Every artifact type can be exported in every format, with all fields (title, description, steps, expected result, API details, severity, priority, etc.) included in each export. Formatting and content are consistent across Word, PDF, and Excel.
- **Test Plan Generation:** Automatically creates a structured test plan covering objectives, scope, endpoints, stories, test cases, risk assessment, deliverables, criteria, roles, execution strategy, schedule, tools, approvals, references, features, staffing, and more.
- **Test Scenario & Test Case Generation:** Identifies high-level test scenarios and generates detailed test cases with all relevant fields and step-by-step instructions.
- **Playwright Automation Code Generation:** Instantly generate Playwright test scripts for all identified API endpoints. Download a ready-to-use Playwright framework with a single click.
- **Configuration UI:** Easily set and test your OpenAI API key, endpoint, model, and other settings directly from the app’s configuration screen (OpenConfig). Supports both UI-based and .env file configuration.
- **Built-in Chatbot:** Get instant help, troubleshooting, and testing guidance directly in the app.
- **Modern UI & Seamless Workflow:** Upload HAR or Postman Collection files, select artifact type and export format, and download results in one streamlined flow.

✨ All outputs are ready for professional sharing, audit, and reporting. Export quality and completeness are guaranteed for every artifact and format.
## 📄 Export Formats & Document Quality

CodePulse AI delivers high-quality, ready-to-share documents for all generated artifacts:

- **Word (DOCX):** Uses the [`docx`](https://www.npmjs.com/package/docx) package for advanced formatting—headings, tables, bold labels, bullet lists, and section spacing. Suitable for direct inclusion in test documentation or sharing with stakeholders.
- **PDF:** Uses [`jsPDF`](https://www.npmjs.com/package/jspdf) and [`jspdf-autotable`](https://www.npmjs.com/package/jspdf-autotable) for visually consistent, paginated PDF reports with tables, headings, and professional layout.
- **Excel (XLSX):** Uses [`xlsx-populate`](https://www.npmjs.com/package/xlsx-populate) for structured, multi-sheet Excel files with wrapped content and auto-sized columns for easy analysis and reporting.

**Export Parity:** All artifact types (Test Plan, Test Scenarios, Test Cases) can be exported in all formats, with identical fields and formatting. No information is lost or omitted in any export.

**Formatting Improvements:** Every export features clear section separation, bold labels, bullet points, and tables for structured data. Documents are designed for clarity, completeness, and professional presentation.

**Playwright Automation:** Download Playwright test scripts and a ready-to-use Playwright framework for instant automation.

**Configuration & Support:** Configure OpenAI settings via UI or .env, test your connection, and get instant help from the built-in chatbot.

These packages and features ensure CodePulse AI meets enterprise, audit, and professional documentation requirements.

---
## 🛠️ Prerequisites

- Before running this project locally, ensure you have the following installed:

- Node.js: To manage dependencies and run the application.

- npm or yarn: To install the required dependencies.

- Azure OpenAI API Key: (If using Azure OpenAI) For integration with Azure OpenAI models.

- React: JavaScript library for building user interfaces.

- Tailwind CSS: Utility-first CSS framework for designing the UI.

- Azure OpenAI: AI models to analyze and generate test cases based on API calls.

- File Handling: For uploading and parsing HAR files.


## ⚙️ How It Works

### Step 1: Upload a HAR File or Postman Collection file
Upload a HAR file or Postman Collection file to CodePulse AI. The tool will automatically filter out irrelevant data, such as:
- Irrelevant headers
- Excluded file extensions (e.g., `.js`, `.css`, `.png`, etc.)
- Excluded domains (e.g., analytics and tracking services)
- Duplicate API requests to ensure that only unique and essential endpoints are processed

This intelligent filtering ensures that the OpenAI API generates accurate and efficient outputs.


### Step 2: Generate Testing Artifacts
Choose from one of the following options:
- **Generate Test Plan** – Outlines testing objectives and scope
- **Generate Test Scenarios** – Lists high-level testing scenarios
- **Generate Test Cases** – Details step-by-step validation instructions
- **Generate Code** – Produces Playwright test scripts

### Step 3: Download Results in Your Preferred Format
Download your generated documentation and scripts as Word, PDF, or Excel files. All documents are formatted for professional use and ready for distribution.

---

## 🎯 Value & Benefits

### 🔑 For Developers and Testers
- **Efficiency:** Automates the labor-intensive process of generating test artifacts, saving valuable time and effort.
- **Accuracy:** Uses OpenAI's GPT-4o to produce precise and reliable testing outputs.
- **Versatility:** Supports a wide range of testing needs, from planning to automation.
- **Seamless Integration:** One-click generation ensures ease of use and rapid turnaround.

---

## 🛠️ Setup

### Step 1: Clone the Repository
```bash
git clone https://git.thepsi.com/Reusable-Components/apiautomationbot-openai.git
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Application
```bash
npm run dev
```

### Step 4: Set Up Environment Variables 
You can configure the OpenAI API settings using either of the following two methods:

***Method 1: Using the UI (Recommended)***
1. After starting the application.
2. Navigate to the UI in your browser.
3. Click on the `OpenConfig` link.
4. Enter and save your OpenAI API Key, Endpoint, and API Version, Model, Max Token Size and Batch Size directly from the configuration screen.
5. Click Save

***Method 2: Using the .env File***
Update `.env` file in the root directory and configure the following variables:

```
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=your_endpoint_here
AZURE_OPENAI_API_VERSION=2024-02-15-preview
VITE_AZURE_OPENAI_API_TOKEN_SIZE=token_size
VITE_AZURE_OPENAI_API_BATCH_SIZE=batch_size

```
### Verify OpenAI Configurations
After Saving again reach on OpenConfig Screen
Click `Test Connection`
Successful connection will give OpenAI Generated Message Response.

---

## 📁 Project Structure

```
CodePulse-AI/
├── src/
│   ├── api/           # API-related logic and helpers
│   ├── components/    # React UI components
│   ├── scripts/       # Scripts for test generation
│   ├── services/      # Service modules (OpenAI, config, etc.)
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions (e.g., HAR parser)
│   ├── App.tsx        # Main React app component
│   ├── MainApp.tsx    # Main application logic
│   ├── index.css      # Global styles
│   ├── main.tsx       # App entry point
│   └── vite-env.d.ts  # Vite environment types
├── tests/             # Test files
├── test-results/      # Test result outputs
├── playwright-report/ # Playwright test reports
├── Dockerfile         # Docker configuration
├── package.json       # Project dependencies and scripts
├── README.md          # Project documentation
├── .env               # Environment variables
├── tsconfig*.json     # TypeScript configuration files
├── vite.config.ts     # Vite build configuration
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js  # PostCSS configuration
├── eslint.config.js   # ESLint configuration
└── index.html         # HTML entry point
```

## 🐛 Troubleshooting

### Common Issues
1. **API Key Not Found:**
   - Ensure your `.env` file contains the correct API key and endpoint.

2. **Test Generation Errors:**
   - Verify that the HAR file contains valid API requests.


---

## 💡 Acknowledgements
Special thanks to OpenAI for providing the GPT-4o model and the Playwright team for their robust testing framework.

