# Contributing to ERP Business System

## 🌟 Welcome Contributors!

Thank you for your interest in contributing to our ERP system. This document provides guidelines for contributing to the project.

## 🏗️ Project Structure

```
erp-business-system/
├── components/          # Vue components
├── pages/              # Nuxt pages (40+ pages)
├── stores/             # Pinia stores (6 stores)
├── api/                # API endpoints (78+ endpoints)
├── types/              # TypeScript definitions
├── services/           # Business logic services
├── database/           # Database schemas & migrations
└── tests/              # Test suites
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 8+
- Git
- Supabase account

### Local Setup
```bash
# Clone the repository
git clone https://github.com/Alishanbouraa/erp-business-system.git
cd erp-business-system

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database setup
npm run setup:db

# Start development server
npm run dev
```

## 🔄 Development Workflow

### 1. Branch Strategy
```bash
# Feature development
git checkout -b feature/inventory-alerts
git checkout -b feature/sales-reports

# Bug fixes
git checkout -b fix/login-authentication
git checkout -b fix/stock-calculation

# Hotfixes
git checkout -b hotfix/critical-pos-error
```

### 2. Commit Convention
```bash
# Format: type(module): description
git commit -m "feat(inventory): add low stock alerts"
git commit -m "fix(auth): resolve JWT token expiry"
git commit -m "docs(api): update endpoint documentation"

# Types: feat, fix, docs, style, refactor, test, chore
# Modules: auth, inventory, sales, pos, reports, etc.
```

### 3. Code Quality
```bash
# Before submitting PR
npm run lint          # ESLint check
npm run typecheck     # TypeScript check
npm run test          # Run tests
npm run format        # Prettier formatting
```

## 🏷️ ERP Modules & Responsibilities

### Core Modules
- **Authentication**: Login, register, roles, permissions
- **Inventory**: Products, categories, stock levels, transfers
- **Sales & POS**: Orders, invoices, payments, returns
- **Purchases**: Purchase orders, receiving, supplier management
- **Reports**: Analytics, dashboards, exports
- **Settings**: Company profile, preferences, configurations

### Module Ownership
| Module | Lead Developer | Reviewers |
|--------|----------------|------------|
| Authentication | @lead-dev | @senior-dev1 |
| Inventory | @inventory-expert | @lead-dev |
| Sales & POS | @sales-specialist | @pos-expert |
| Reports | @analytics-dev | @lead-dev |

## 📋 Pull Request Process

### 1. Before Creating PR
- [ ] Feature/fix is complete
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] Code reviewed locally
- [ ] No merge conflicts

### 2. PR Requirements
- [ ] Clear title and description
- [ ] Screenshots for UI changes
- [ ] Breaking changes documented
- [ ] Related issues linked
- [ ] Reviewers assigned

### 3. Review Process
- **2 approvals required** for core modules
- **1 approval required** for documentation/minor fixes
- **Lead approval required** for breaking changes

## 🧪 Testing Strategy

### Unit Tests
```bash
# Component tests
npm run test:unit -- ProductCard.vue

# Store tests
npm run test:unit -- stores/products.test.ts

# API tests
npm run test:unit -- api/v1/products.test.ts
```

### Integration Tests
```bash
# Full workflow tests
npm run test:integration -- sales-workflow.test.ts

# Database tests
npm run test:integration -- database-operations.test.ts
```

### E2E Tests
```bash
# User journey tests
npm run test:e2e -- pos-checkout.spec.ts

# Cross-browser tests
npm run test:e2e:ci
```

## 🗂️ Issue Management

### Labels
- **Priority**: `critical`, `high`, `medium`, `low`
- **Type**: `bug`, `enhancement`, `documentation`
- **Module**: `inventory`, `sales`, `pos`, `reports`
- **Status**: `needs-review`, `in-progress`, `blocked`

### Milestones
- **v1.1.0**: Advanced reporting features
- **v1.2.0**: Multi-currency support
- **v1.3.0**: Mobile app integration

## 🚢 Release Process

### Version Strategy
- **Major (x.0.0)**: Breaking changes, new modules
- **Minor (x.y.0)**: New features, enhancements
- **Patch (x.y.z)**: Bug fixes, security updates

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Migration scripts ready
- [ ] Deployment plan reviewed
- [ ] Rollback plan prepared

## 📚 Resources

- **Documentation**: [Project Wiki](https://github.com/Alishanbouraa/erp-business-system/wiki)
- **API Reference**: [API Documentation](https://api-docs.erp-system.com)
- **Design System**: [Figma Components](https://figma.com/erp-design)
- **Slack Channel**: #erp-development
- **Weekly Standups**: Mondays 9:00 AM

## 🎯 Code Standards

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- Interface definitions for all data structures

### Vue 3
- Composition API preferred
- `<script setup>` syntax
- Proper prop validation
- Emit type definitions

### CSS
- Tailwind CSS utility classes
- Component-scoped styles when needed
- Responsive design first

## 🆘 Getting Help

- **Technical Issues**: Create issue with `help-wanted` label
- **Architecture Questions**: Tag `@lead-dev` in discussions
- **Urgent Bugs**: Use `critical` label and notify team
- **Documentation**: Check wiki first, then ask in Slack

---

**Happy Coding! 🚀**

For questions, reach out to the development team or create an issue.