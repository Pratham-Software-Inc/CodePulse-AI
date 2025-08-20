# CodePulse AI
**From Test Plan to Automation – Instantly**

---

## 🌟 Overview
CodePulse AI, powered by OpenAI’s GPT-4o and Omini-3, is an advanced tool designed to automate and streamline the creation of testing artifacts from HAR or Postman collection files. By leveraging the intelligent capabilities of GPT-4o and Omini-3, CodePulse AI significantly reduces the effort required to generate comprehensive testing documentation and scripts.

With just a few clicks, developers and testers can quickly transform HAR or Postman collection files into structured test plans, test scenarios, detailed test cases, and Playwright automation scripts.

## Privacy Policy

[Privacy Policy](https://pratham-software-inc.github.io/CodePluse-AI/privacy-policy.html)

---

## 🚀 Key Features

- **Test Plan Generation:** Automatically creates a structured test plan that outlines testing objectives, scope, and strategy.
- **Test Scenario Generation:** Identifies high-level test scenarios from extracted API endpoints, providing clear guidance on testing coverage.
- **Test Case Generation:** Generates detailed test cases with step-by-step instructions for efficient validation.
- **Automation Code Generation:** Creates Playwright test scripts for identified API endpoints, allowing for quick and reliable automated testing.
- Sample Playwright Framework: Provides a dedicated button to download a sample Playwright framework, making it easy for users to set up their testing environment.

✨ Each output can be easily downloaded directly to the user's Downloads folder. Additionally, the tool includes a dedicated button to download a sample Playwright framework, simplifying the setup process. For added convenience, a built-in chatbot is available to assist users with testing-related queries and help with any questions regarding CodePulse AI.

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
- **Generate Test Plan** - Outlines testing objectives and scope
- **Generate Test Scenarios** - Lists high-level testing scenarios
- **Generate Test Cases** - Details step-by-step validation instructions
- **Generate Code** - Produces Playwright test scripts

### Step 3: Download Results
Instantly download the generated content, including structured documentation and automation scripts.

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
git clone https://github.com/Pratham-Software-Inc/CodePluse-AI.git
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
Special thanks to OpenAI for providing the GPT-4o and Omini-3 model and the Playwright team for their robust testing framework.

