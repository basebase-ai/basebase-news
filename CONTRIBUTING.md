# Contributing to NewsWithFriends

Thank you for considering contributing to NewsWithFriends! This document outlines the process for contributing to the project and helps ensure a smooth collaboration.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report:

1. Check the existing issues to see if the problem has already been reported
2. If you're unable to find an open issue addressing the problem, create a new one
3. Include as many details as possible:
   - A clear and descriptive title
   - Steps to reproduce the behavior
   - Expected behavior
   - Screenshots if applicable
   - Browser/device information
   - Any additional context

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues:

1. Check the existing issues to see if the enhancement has already been suggested
2. Create a new issue with:
   - A clear and descriptive title
   - Detailed description of the proposed enhancement
   - Any possible implementation details
   - Why this would benefit the project

### Pull Requests

1. Fork the repository and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes (if applicable)
5. Make sure your code follows the existing code style
6. Submit a pull request

## Development Process

### Setting Up Your Development Environment

1. Fork and clone the repository
2. Install dependencies with `npm install`
3. Copy `.env.example` to `.env` and configure it with your development values
4. Start the development server with `npm run dev`

### Project Structure

- `/public` - Static frontend assets
- `/src` - Backend server code
  - `/components` - UI components
  - `/models` - Database models
  - `/services` - Business logic and external APIs
  - `/scripts` - Utility scripts

### Coding Standards

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Maintain responsive design for UI changes
- Write meaningful comments for complex logic
- Use meaningful variable and function names

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## Releasing

The project maintainers will handle releasing new versions of the application.

## Questions?

If you have questions or need help, please:

1. Check existing issues and discussions
2. Create a new discussion or issue for broader topics

Thank you for contributing to NewsWithFriends!
