# Crypto Grapher

A modern encryption tool built with Next.js 14, featuring advanced visualization, algorithm comparison, and file encryption capabilities.

## Features

- **Text Encryption/Decryption**: Encrypt and decrypt text using multiple algorithms
- **File Encryption/Decryption**: Securely encrypt and decrypt files
- **Live Visualization**: See the encryption process in real-time with algorithm-specific visualizations
- **Algorithm Comparison**: Compare performance and security metrics of different algorithms
- **Customizable Parameters**: Fine-tune encryption parameters for block ciphers
- **Advanced Security**: Key strength indicators, recommendations, and best practices
- **Modern UI**: Dark/light mode, responsive design, and intuitive interface
- **PWA Support**: Install as a standalone application

## Supported Algorithms

- AES (Advanced Encryption Standard)
- DES (Data Encryption Standard)
- Triple DES
- RC4
- Rabbit
- One-Time Pad (OTP)
- *With placeholders for: ChaCha20, Blowfish, RSA, and ECC*

## Technologies Used

- **Framework**: Next.js 14 with App Router
- **UI**: Tailwind CSS, React Icons
- **State Management**: React Hooks
- **Encryption**: CryptoJS
- **File Handling**: react-dropzone
- **Theming**: next-themes

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- Yarn package manager

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/crypto-grapher.git
   cd crypto-grapher
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Run the development server:
   ```
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```
yarn build
yarn start
```

## Security Notice

This application is designed for educational and demonstration purposes. While it implements standard encryption algorithms, it should not be used for highly sensitive data without further security reviews and enhancements.

## License

MIT

## Credits

Modernized from the original Crypto_Grapher application, with significant enhancements in functionality, user experience, and visualization capabilities.
