module.exports = {
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  printWidth: 80,
  tabWidth: 2,
  semi: true,
  importOrder: [
    "^@/(.*)$",
    "^@types/(.*)$",
    "^@routes/(.*)$",
    "^@lib/(.*)$",
    "^@utils/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
