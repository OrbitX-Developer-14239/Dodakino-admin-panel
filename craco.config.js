/**
 * craco.config.js  — loyiha root da bo'ladi
 *
 * O'rnatish:
 *   npm install @craco/craco --save-dev
 *
 * package.json scripts ni o'zgartiring:
 *   "start": "craco start"
 *   "build": "craco build"
 *   "test":  "craco test"
 *
 * Bu config:
 *   assets/icons/*.svg fayllarni raw SVG string sifatida import qiladi.
 *   Boshqa SVG lar (components/ va hokazo) oddiy CRA xatti-harakati bilan ishlaydi.
 */

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // CRA ning mavjud SVG rule ni topib, faqat icons/ papkasidan chiqaramiz
      const fileLoaderRule = webpackConfig.module.rules
        .flatMap((r) => r.oneOf ?? [])
        .find((r) => r.test && r.test.toString().includes('svg'));

      if (fileLoaderRule) {
        // icons/ papkasini exclude qilamiz — u raw-loader orqali yuklanadi
        fileLoaderRule.exclude = [
          ...(fileLoaderRule.exclude ? [fileLoaderRule.exclude] : []),
          /src[\\/]assets[\\/]icons/,
        ];
      }

      // icons/ papkasi uchun raw-loader qo'shamiz
      webpackConfig.module.rules.push({
        test: /\.svg$/,
        include: /src[\\/]assets[\\/]icons/,
        use: 'raw-loader',
        type: 'javascript/auto',
      });

      return webpackConfig;
    },
  },
};