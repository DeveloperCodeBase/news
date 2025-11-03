module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'next/typescript'],
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    'import/no-anonymous-default-export': 'off'
  }
};
