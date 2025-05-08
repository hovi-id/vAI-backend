# vAI Backend

This repository contains the backend implementation for the cheqd verfiable AI hackathon project.
https://dorahacks.io/hackathon/cheqd-verifiable-ai/

## Features

- Creation and Acceptance of Didcomm connections
- Issuance/Verification of Anoncreds credentials with cheqd 
- Verification of DID-linked resources using cheqd studio APIs
- Cloud wallet creation and mangement
- Make phone calls with AI Agent


## Technologies used

- [cheqd](https://cheqd.io)
- [Hovi](https://studio.hovi.id)
- [Bland.ai](https://bland.ai)

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/hovi-id/vAI-backend.git
    cd vAI-backend
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Configure environment variables:
    Create a `.env` file in the root directory and add the required variables. See env.sample

## Usage

Start the development server:
```bash
npm run dev
```

Run the production build:
```bash
npm start
```

## License

This project is licensed under the [MIT License](LICENSE).