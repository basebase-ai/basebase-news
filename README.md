# NewsWithFriends

A modern news headline aggregation web application that brings the world's headlines to you at a glance.

![NewsWithFriends](public/assets/images/icon_256x256.png)

## Features

- **News Aggregation**: Automatically collects headlines from multiple sources
- **Customizable Dashboard**: Select your preferred news sources
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Choose between light and dark themes
- **Paywall Detection**: Identifies content that might be behind paywalls
- **Search Functionality**: Easily find stories across all your sources
- **Source Management**: Add, edit, and organize news sources
- **User Accounts**: Save your preferences across devices

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **Frontend**: HTML5, CSS3 (TailwindCSS), JavaScript
- **Authentication**: JWT-based email magic links
- **Web Scraping**: Cheerio, ScrapingBee API
- **NLP**: LangChain, Anthropic Claude for content analysis

## Getting Started

### Prerequisites

- Node.js (v16+)
- BaseBase backend API for storage
- API keys for ScrapingBee and Anthropic Claude (optional, for advanced features)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Joinable-Inc/storylist.git
   cd storylist
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create an environment file:
   ```bash
   cp .env.example .env
   ```
4. Edit the `.env` file with your configuration details

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

### Environment Variables

See `.env.example` for all required environment variables. The essential ones are:

## Contributing

We welcome contributions to NewsWithFriends! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -am 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Submit a pull request

### Code Style

- Follow the established patterns in the codebase
- Use TypeScript for new code
- Ensure responsive design for all UI changes
- Write comments for complex logic

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- All the news sources that make this aggregator possible
- The open source community for the excellent tools and libraries used in this project
